//! 原生网络层 —— 书源系统「发起网络请求」的实现。
//!
//! **为什么必须放在原生侧**：WebView 里 `fetch` 外站会被 CORS 拦
//! （真机实测：`fetch('https://www.wenku8.net/')` → `Failed to fetch`，
//! 而同页 `<img src="https://img.wenku8.com/...">` 能正常加载 200×300 ——
//! 说明网络是通的，纯粹是 CORS）。书源要抓的是**任意第三方站点**，
//! 不可能指望它们都给我们发 `Access-Control-Allow-Origin`。
//!
//! **为什么是共用模块而不是两端各写一份**：请求语义（重定向、cookie、头键大小写、
//! 字节回传）必须逐字一致，否则「同一个源在 PC 上能跑、在安卓上不行」这种 bug
//! 会极难查。平台文件只挂一个两行的薄命令。
//!
//! ⚠️ 这是**和 Kotlin 桥并行的第二个实现**（`gen/android` 里的 `安卓网络`）。
//! 两版都做是为了实测对比谁更能过 Cloudflare —— 前端的 `方法/网络.android.js`
//! 用一个常量切换走哪条路。对比完可以删掉输的那条。

use base64::{engine::general_purpose::STANDARD as B64, Engine as _};
use std::sync::OnceLock;
use std::time::Duration;

/// 默认 UA。**必须像真浏览器** —— 挂了 Cloudflare 的站会对
/// `reqwest/0.12` 这种裸 UA 直接 403（已实测：curl 无 UA 访问文库8 = 403 挑战页）。
const 默认UA: &str = "Mozilla/5.0 (Linux; Android 16; 2410DPN6CC) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/153.0.8010.36 Mobile Safari/537.36";

/// 全局单例。cookie jar 挂在 Client 上，**不同域名的 cookie 天然隔离** ——
/// 所以一个 client 服务所有源是安全的（文库8 的登录态不会串到别的站）。
///
/// ⚠️ 为什么是**两个** client 而不是「一个 + 每次请求改策略」：
///    当前 reqwest 版本的 `RequestBuilder` **没有 `redirect()`**（编译报 E0599），
///    重定向策略只能在 `ClientBuilder` 上设，而那是按 client 生效的。
///    于是建两个（跟随 / 不跟随）各 `OnceLock` 一份 —— 代价只是两份连接池。
///    源要靠 3xx 的 `location` 判「精确匹配 / 未登录」，所以「不跟随」这条路是刚需。
fn 客户端(跟随重定向: bool) -> &'static reqwest::Client {
    static 跟随: OnceLock<reqwest::Client> = OnceLock::new();
    static 不跟随: OnceLock<reqwest::Client> = OnceLock::new();
    let 槽 = if 跟随重定向 { &跟随 } else { &不跟随 };
    槽.get_or_init(|| {
        reqwest::Client::builder()
            .cookie_store(true)
            .user_agent(默认UA)
            // 连接超时兜底：源给的超时管「整次请求」，这里再保一层，
            // 免得某个不响应的站把一条任务挂死。
            .connect_timeout(Duration::from_secs(15))
            .redirect(if 跟随重定向 {
                reqwest::redirect::Policy::limited(10)
            } else {
                reqwest::redirect::Policy::none()
            })
            .build()
            .expect("网络客户端建不起来")
    })
}

/// 发一次请求。选项与返回都是裸 JSON —— 省掉一层 struct 与前端字段名的同步成本。
///
/// 入参：
/// ```json
/// { "地址": "https://...", "方法": "GET|POST|...", "头": {"referer": "..."},
///   "数据": "原始body" | {"键": "值"}, "不跟随重定向": false, "超时毫秒": 30000 }
/// ```
/// 返回：
/// ```json
/// { "状态": 200, "头": {"content-type": "..."}, "原始": "<base64>",
///   "最终地址": "https://...", "字节数": 12345 }
/// ```
/// ⚠️ `原始` 是 **base64** —— 前端的 `编码处理.文本解码` 拿它转 `Uint8Array` 再解码。
///    为什么不在 Rust 侧直接解成文本：源里写的是
///    `首页.文本 ?? await 编码处理.文本解码(首页.原始, "gbk")` ——
///    **两个字段都可能被用**，而 `TextDecoder('gbk')` 在 WebView 里是原生支持的，
///    前端解一次就够，不必让 Rust 也备一套编码表。
pub async fn 发请求(选项: serde_json::Value) -> Result<serde_json::Value, String> {
    let 地址 = 选项
        .get("地址")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "E-NET-101：缺少 地址".to_string())?;
    let 方法 = 选项
        .get("方法")
        .and_then(|v| v.as_str())
        .unwrap_or("GET")
        .to_ascii_uppercase();

    let 方法枚举 = reqwest::Method::from_bytes(方法.as_bytes())
        .map_err(|_| format!("E-NET-102：不认识的请求方法「{方法}」"))?;

    // 重定向策略按 client 走（见 `客户端()` 的说明）
    let 不跟随重定向 = 选项.get("不跟随重定向").and_then(|v| v.as_bool()).unwrap_or(false);
    let mut 请求 = 客户端(!不跟随重定向).request(方法枚举, 地址);

    // 头。⚠️ 响应侧 reqwest 给的是**小写**键名，源里也按小写读（协议里已注明）。
    if let Some(头表) = 选项.get("头").and_then(|v| v.as_object()) {
        for (键, 值) in 头表 {
            let Some(值) = 值.as_str() else { continue };
            // 非法头名/头值（含非 ASCII）在这里被挡掉，而不是让 reqwest panic。
            if let (Ok(名), Ok(值)) = (
                reqwest::header::HeaderName::from_bytes(键.as_bytes()),
                reqwest::header::HeaderValue::from_str(值),
            ) {
                请求 = 请求.header(名, 值);
            }
        }
    }

    // 数据：字符串当原始 body；对象当表单（`application/x-www-form-urlencoded`）。
    // 这两种覆盖了源协议里全部场景（POST 表单 / POST 原始体）。
    if let Some(数据) = 选项.get("数据") {
        if let Some(文本) = 数据.as_str() {
            请求 = 请求.body(文本.to_string());
        } else if let Some(表) = 数据.as_object() {
            let 对: Vec<(String, String)> = 表
                .iter()
                .map(|(键, 值)| {
                    (
                        键.clone(),
                        值.as_str().map(str::to_string).unwrap_or_else(|| 值.to_string()),
                    )
                })
                .collect();
            请求 = 请求.form(&对);
        }
    }

    // 不跟随重定向的情况在选 client 时就定了（见上面 不跟随重定向 那段）——
    // 源靠 3xx 的 `location` 判「精确匹配」与「未登录」，所以必须能拿到 3xx 响应本身。
    if let Some(毫秒) = 选项.get("超时毫秒").and_then(|v| v.as_u64()) {
        请求 = 请求.timeout(Duration::from_millis(毫秒));
    }

    let 响应 = 请求
        .send()
        .await
        .map_err(|错误| format!("E-NET-103：请求失败 —— {错误}"))?;

    let 状态 = 响应.status().as_u16();
    let 最终地址 = 响应.url().to_string();
    let mut 头 = serde_json::Map::new();
    // ⚠️ 同名头可能有**多个值**（最典型的就是 `set-cookie`，一次响应种好几个 cookie）。
    //    `headers()` 会为每个值各产出一次，直接 insert 会把前面的**覆盖掉** ——
    //    结果是「只拿到最后一个 cookie」，登录态莫名少一半，且完全看不出为什么。
    //    所以同名值用 `\n` 连接（HTTP 头值里不可能有换行，分隔无歧义），前端按 `\n` 拆。
    for (键, 值) in 响应.headers() {
        let 名 = 键.as_str().to_string();
        let 新值 = 值.to_str().unwrap_or("");
        match 头.get(&名) {
            Some(serde_json::Value::String(已有)) if !已有.is_empty() => {
                头.insert(名, format!("{已有}\n{新值}").into());
            }
            _ => {
                头.insert(名, 新值.into());
            }
        }
    }

    let 字节 = 响应
        .bytes()
        .await
        .map_err(|错误| format!("E-NET-104：读响应体失败 —— {错误}"))?;

    Ok(serde_json::json!({
        "状态": 状态,
        "头": 头,
        "原始": B64.encode(&字节),
        "最终地址": 最终地址,
        "字节数": 字节.len(),
    }))
}
