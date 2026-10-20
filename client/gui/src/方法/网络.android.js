import { invoke } from '@tauri-apps/api/core';

// 原生网络接口 安卓
//
// 为什么必须有原生层 WebView 里 fetch 外站会被 CORS 拦
// 真机实测 fetch 主站 返 Failed to fetch 而同页 img 能加载外站图 网络是通的纯粹 CORS
// 书源要抓任意第三方站点 不可能指望它们都发 Access-Control-Allow-Origin
//
// 两条后端 并存是为了实测对比
//   rust 走 invoke 网络请求 Rust 侧 reqwest 自带 cookie jar 按域名隔离
//   kotlin 走 window.安卓网络.请求 Kotlin 侧 HttpURLConnection 复用系统 CookieManager
//     好处是 WebView 过掉的 CF 挑战能被它复用
//
// 对外只有 发起请求 一个出口 返回形状两边完全一致 切换后端不用动工具层
//
// 用可变对象不用 const 后端 实测对比要在页面里当场切换
// 写成常量就得改代码重载一轮
export const 网络设置 = { 后端: 'rust' };

// Rust 侧要裸 JSON Kotlin 侧要 JSON 字符串 桥参数只收基本类型
// 两边选项结构同一份 地址 方法 头 数据 不跟随重定向 超时毫秒

async function rust请求(选项) {
    const 结果 = await invoke('网络请求', { 选项 });
    return 结果;
}

// Kotlin 桥是异步回调 HttpURLConnection 阻塞 不能占着 JavaBridge 线程
// 用 请求标识 到 Promise 完成函数 的表配对
const 等待中的请求 = new Map();
let 请求计数 = 0;

function kotlin请求(选项) {
    return new Promise((完成, 失败) => {
        const 桥 = globalThis.安卓网络;
        if (!桥 || typeof 桥.请求 !== 'function') {
            失败(new Error('当前平台没有 安卓网络 桥'));
            return;
        }
        const 标识 = String(++请求计数);
        等待中的请求.set(标识, 完成);
        try {
            桥.请求(标识, JSON.stringify(选项));
        } catch (错误) {
            等待中的请求.delete(标识);
            失败(错误);
        }
    });
}

// 原生回调入口 Kotlin 侧 evaluateJavascript 调它
// 挂在 globalThis 上而不是模块里 原生侧只知道这个名字
globalThis.__安卓网络结果 = (标识, 结果json) => {
    const 完成 = 等待中的请求.get(String(标识));
    if (!完成) return; // 超时或页面重载后的迟到回调 丢掉
    等待中的请求.delete(String(标识));
    完成(JSON.parse(结果json));
};

// ─────────────────────────── 过挑战 ───────────────────────────
//
// CF 的 JS 挑战 普通 HTTP 请求过不了 reqwest 和 HttpURLConnection 都不跑 JS
// 唯一入口是系统 WebView 的引擎
//
// 这里是丐版 原生侧开一个 1x1 隐形 WebView 加载目标页 等 cf_clearance 落进 CookieManager
// 再把 cookie 串回传 并进源凭据之后就一劳永逸 两条后端都吃源凭据 不挑后端
//
// 这里不负责写凭据 那是 工具.js 的事 它才有源的凭据表
// 本函数只回答 过没过去 和 拿到的 cookie 串是什么
const 等待中的挑战 = new Map();

// POST 也走这条路 登录是 POST 普通 HTTP 必被 CF 403
// 原先只让 GET 走 WebView POST 退回普通客户端 结果清空 cookie 后再也登不进去
// 选项 方法 体 头 省略即 GET
//
// 隐藏 WebView 同一时刻只能取一页 这里必须串行
// 原生侧只有一台隐藏 WebView 每次取页都会换掉它的 webViewClient
// 两个请求同时在飞 后一个把前一个的回调接管掉 谁拿到谁的页面全看运气
// 真机实测 详情页与目录并行拉时 目录那次拿到了详情页的地址
// 被工具层还原成 302 加文本 null 源那边直接 Cannot read properties of null
// 代价只是排一次队 换来的是响应一定配得上请求
let 取页队列 = Promise.resolve();

export function 过挑战(地址, 选项 = {}) {
    const 前一个 = 取页队列.catch(() => {});
    let 放行;
    取页队列 = new Promise((完) => { 放行 = 完; });
    return 前一个.then(() => 取页(地址, 选项)).finally(放行);
}

// 真正发一次取页 别直接调它 一定要经过上面那道串行闸门
function 取页(地址, 选项 = {}) {
    return new Promise((完成) => {
        const 桥 = globalThis.安卓网络;
        if (!桥 || typeof 桥.过挑战 !== 'function') {
            完成({ 成功: false, 错误: '当前平台没有过挑战能力（PC / 旧包）' });
            return;
        }
        const 标识 = String(++请求计数);
        等待中的挑战.set(标识, 完成);
        try {
            const 方法 = String(选项.方法 || 'GET').toUpperCase();
            const 有体 = 方法 !== 'GET' && 方法 !== 'HEAD';
            const 载荷 = JSON.stringify({
                方法,
                体: 有体 ? String(选项.体 ?? '') : '',
                头: 选项.头 || {},
            });
            桥.过挑战(标识, String(地址), 载荷);
        } catch (错误) {
            等待中的挑战.delete(标识);
            完成({ 成功: false, 错误: String(错误?.message ?? 错误) });
        }
    });
}

globalThis.__安卓过挑战结果 = (标识, 结果json) => {
    const 完成 = 等待中的挑战.get(String(标识));
    if (!完成) return;
    等待中的挑战.delete(String(标识));
    try {
        完成(JSON.parse(结果json));
    } catch {
        完成({ 成功: false, 错误: '过挑战结果不是 JSON' });
    }
};

// ─────────────── 凭据 和 系统 CookieManager 双向同步 ───────────────
//
// 两份 cookie 必须同步 否则出两种很难查的错
//
//   不同步 WebView 的同源 fetch 带的是 CookieManager 那份 不是 App 凭据那份
//     登录 POST 走 WebView 成功后站点种在 CookieManager 里 而 App 读凭据文件
//     明明登录成功了 已登录 却判 false 搜索一直被拦
//   只清 App 凭据 CookieManager 里旧登录态还在
//     (a) 用户点了清空 cookie 搜索却照样能跑 清了个寂寞
//     (b) 重新登录时 WebView 带着旧登录态去 POST 站点当已登录忽略新密码
//         报 登录失败请检查用户名和密码 这就是清空后登不进去的真凶
const 桥回调 = {};

export function 同步Cookie进WebView(地址, cookie串) {
    const 桥 = globalThis.安卓网络;
    if (!桥 || typeof 桥.设Cookie !== 'function') return { 成功: false, 错误: '本平台没有该能力' };
    return new Promise((完成) => {
        const 标识 = '设' + (++请求计数);
        // 超时给短点 正常 setCookie 是内存操作 几毫秒就回
        // 回调对不上时宁可快点失败 也别让每次请求白等 4 秒
        // 踩过 这个超时曾让每个请求之间固定卡 4 秒 是搜索慢 17 秒的主因之一
        const 计时 = setTimeout(() => {
            桥回调?.设?.delete?.(标识);
            完成({ 成功: false, 错误: '设 cookie 超时' });
        }, 1500);
        (桥回调.设 ||= new Map()).set(标识, (结果json) => {
            clearTimeout(计时);
            try {
                完成(JSON.parse(结果json));
            } catch {
                完成({ 成功: false, 错误: '结果不是 JSON' });
            }
        });
        try {
            // 标识必须传给原生 原生若自己生成键 两边对不上 回调会被丢弃
            桥.设Cookie(标识, String(地址), String(cookie串 || ''));
        } catch (错误) {
            clearTimeout(计时);
            完成({ 成功: false, 错误: String(错误?.message ?? 错误) });
        }
    });
}

export function 清WebViewCookie(地址) {
    const 桥 = globalThis.安卓网络;
    if (!桥 || typeof 桥.清Cookie !== 'function') return { 成功: false, 错误: '本平台没有该能力' };
    return new Promise((完成) => {
        const 标识 = '清' + (++请求计数);
        const 计时 = setTimeout(() => {
            桥回调?.清?.delete?.(标识);
            完成({ 成功: false, 错误: '清 cookie 超时' });
        }, 1500);
        (桥回调.清 ||= new Map()).set(标识, (结果json) => {
            clearTimeout(计时);
            try {
                完成(JSON.parse(结果json));
            } catch {
                完成({ 成功: false, 错误: '结果不是 JSON' });
            }
        });
        try {
            // 同上 标识必须传进去 否则回调对不上
            桥.清Cookie(标识, String(地址));
        } catch (错误) {
            clearTimeout(计时);
            完成({ 成功: false, 错误: String(错误?.message ?? 错误) });
        }
    });
}

globalThis.__安卓设Cookie结果 = (标识, 结果json) => {
    桥回调.设?.get(String(标识))?.(结果json);
};
globalThis.__安卓清Cookie结果 = (标识, 结果json) => {
    桥回调.清?.get(String(标识))?.(结果json);
};

// base64 到 字节数组
//
// 走 atob 不用 fetch data 后者是异步的 大响应上还会被当资源加载触发额外解码流程
export function 解码base64(文本) {
    const 二进制 = atob(文本 || '');
    const 字节 = new Uint8Array(二进制.length);
    for (let i = 0; i < 二进制.length; i++) 字节[i] = 二进制.charCodeAt(i);
    return 字节;
}
const base64转字节 = 解码base64;

// 发一次请求 返回统一形状 两条后端一致
//
//   { 成功: true, 状态, 头, 原始: Uint8Array, 最终地址, 字节数 }
//   { 成功: false, 错误 }
//
// 状态 是 HTTP 状态码 3xx 4xx 都算成功拿到响应
// 源要靠 302 的 location 判精确匹配和未登录 那是正常业务路径 不是错误
// 只有请求根本没发出去或读不到响应才算 成功 false
export async function 发起请求(选项) {
    const 用选项 = {
        方法: 'GET',
        不跟随重定向: false,
        超时毫秒: 30000,
        ...选项,
    };
    // UA 必须和 WebView 的逐字一致 CF 的 cf_clearance 绑 UA
    // 过挑战是拿 WebView 去过的 这里若用别的 UA 挑战过了也照样 403
    // Rust 侧写死的常量缺了真机 UA 里的 Build wv 一段 实测两边并不一样
    // 源自己给了 UA 就以源为准 同名键后面的覆盖前面的
    用选项.头 = { 'User-Agent': navigator.userAgent, ...(选项.头 || {}) };
    try {
        const 原始结果 = 网络设置.后端 === 'kotlin' ? await kotlin请求(用选项) : await rust请求(用选项);
        if (原始结果?.失败) return { 成功: false, 错误: String(原始结果.失败) };
        return {
            成功: true,
            状态: Number(原始结果?.状态 ?? 0),
            头: 原始结果?.头 ?? {},
            原始: base64转字节(原始结果?.原始),
            最终地址: 原始结果?.最终地址 ?? '',
            字节数: Number(原始结果?.字节数 ?? 0),
        };
    } catch (错误) {
        return { 成功: false, 错误: String(错误?.message ?? 错误) };
    }
}

// 便捷封装 要文本的场合 源里大多数是这种 给了 编码 就用它解 否则 UTF-8
export async function 发起文本请求(选项) {
    const 结果 = await 发起请求(选项);
    if (!结果.成功) return 结果;
    const 编码 = 选项?.编码 || 'utf-8';
    try {
        结果.文本 = new TextDecoder(编码).decode(结果.原始);
    } catch {
        // 不认识的编码名 ansi 之类 退回 UTF-8 别让整次请求失败
        结果.文本 = new TextDecoder('utf-8').decode(结果.原始);
    }
    return 结果;
}
