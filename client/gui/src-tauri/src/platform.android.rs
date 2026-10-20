// Android 平台实现（命令按需补齐；窗口壳走 Tauri 移动端默认）
#![allow(unused_variables)]

use include_dir::{include_dir, Dir};

#[tauri::command]
fn 检查文件是否存在(路径: String) -> bool {
    std::path::Path::new(&路径).exists()
}

#[tauri::command]
fn 写入文件(路径: String, 内容: String) -> Result<(), String> {
    if let Some(父目录) = std::path::Path::new(&路径).parent() {
        if !父目录.exists() {
            std::fs::create_dir_all(父目录).map_err(|e| e.to_string())?;
        }
    }
    std::fs::write(&路径, 内容).map_err(|e| e.to_string())
}

#[tauri::command]
fn 读取文件(路径: String) -> Result<String, String> {
    std::fs::read_to_string(&路径).map_err(|e| e.to_string())
}

// 删一个文件。**本来就不存在算成功** ——「删掉不存在的东西」本身就是目标状态，
// 报错只会逼调用方到处写 try。登出 / 清空账号时删头像正是这个场景：
// 用户从没换过头像的话，文件本来就不存在。
#[tauri::command]
fn 删除文件(路径: String) -> Result<(), String> {
    match std::fs::remove_file(&路径) {
        Ok(()) => Ok(()),
        Err(错误) if 错误.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(错误) => Err(错误.to_string()),
    }
}

// 列出某个目录下的**文件名**（换行分隔）。目录不存在 / 不是目录 → 空串（不报错，
// 和「删除不存在算成功」同一套态度：调用方不该为「首次运行还没这个目录」写 try）。
//
// 为什么返回的是**文件名**而不是完整路径：调用方（存储层）本来就只认
// 「子目录 + 文件名」这套，给它完整路径它还得再拆一次。
// 为什么换行分隔：文件名不含换行 —— 不必为此套一层 JSON。
// 只列文件不列子目录（目前用途是扫 源/ 下的 .js，没有嵌目录的场景）。
#[tauri::command]
fn 列出目录(路径: String) -> Result<String, String> {
    let 目录 = std::path::Path::new(&路径);
    if !目录.is_dir() {
        return Ok(String::new());
    }
    let mut 名单: Vec<String> = std::fs::read_dir(目录)
        .map_err(|e| e.to_string())?
        .filter_map(|项| 项.ok())
        .filter(|项| 项.path().is_file())
        .filter_map(|项| 项.file_name().into_string().ok())
        .collect();
    名单.sort();
    Ok(名单.join("\n"))
}

#[tauri::command]
fn 获取应用目录() -> Result<String, String> {
    let dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.to_string_lossy().to_string()));
    dir.ok_or_else(|| "无法获取应用目录".to_string())
}

// 私有空间根目录：应用独占、外部看不见的落盘区域。
//
// ⚠️ 不能用 获取应用目录（= current_exe 的父目录）：安卓上那是 native
// library 所在目录（/data/app/.../lib/arm64），**只读**，写任何东西都会失败。
// 旧版设置读写就是栽在这里 —— 加上用 '\\' 拼路径（安卓不认反斜杠为分隔符），
// 安卓端读取永远落进 catch 返回默认值、写入永远失败。
//
// 用 app_local_data_dir 而不是 获取应用目录（exe 目录）：见上。
//
// 末端再拼一层 `files`：
//   Tauri 在安卓把 data_dir / local_data_dir **都**解析到 getDataDir()
//   （tauri/src/path/android.rs 里两个分支都是 call_resolve("getDataDir")），
//   也就是 /data/user/0/<包名> —— 数据**根**目录。那里系统自己放着
//   cache/ code_cache/ shared_prefs/ databases/ no_backup/，自定义目录挤进去
//   既有命名撞车风险、语义也乱。
//   AOSP 里 Context.getFilesDir() 就是 new File(getDataDir(), "files")，
//   所以拼出 /data/user/0/<包名>/files 就等于官方的 getFilesDir() ——
//   这才是 Android 留给「应用自己的文件」的位置（备份/迁移策略也认它）。
//
// 注意它只解析路径、**不创建目录**，所以这里顺手建好，让前端拿到的路径一定可写。
#[tauri::command]
fn 私有空间根目录(app: tauri::AppHandle) -> Result<String, String> {
    use tauri::Manager;

    let 根 = app
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("无法解析私有空间路径：{e}"))?
        .join("files");
    std::fs::create_dir_all(&根).map_err(|e| format!("无法创建私有空间目录：{e}"))?;
    Ok(根.to_string_lossy().to_string())
}

// ── 应用存储初始化 ──
//
// 「初始数据」（`client/gui/src/资源/初始数据/`）在**编译期整棵树嵌进二进制**。
// 不用 Tauri 的 bundle.resources，是因为安卓上那套走 APK assets / JNI，
// 路径语义和普通文件系统不一样，还得额外配 tauri.conf.json；嵌入之后就是纯
// std::fs 写文件，行为完全可控。代价：改初始数据要重编译 Rust（几十秒），
// 但初始数据本来就是低频变更。
static 初始数据: Dir<'static> = include_dir!("$CARGO_MANIFEST_DIR/../src/资源/初始数据");

// include_dir! 只收集**文件**，空目录带不上（git 同理），
// 所以初始数据里那些「需要存在但暂时是空的」目录在这里显式补建。
// 路径相对「初始数据」根。
const 初始空目录: &[&str] = &["数据/用户资源/头像"];

// 递归把嵌入目录写进目标根
fn 释放嵌入目录(目录: &Dir, 目标根: &std::path::Path, 计数: &mut usize) -> Result<(), String> {
    for 项 in 目录.entries() {
        let 目标 = 目标根.join(项.path());
        if let Some(子目录) = 项.as_dir() {
            std::fs::create_dir_all(&目标).map_err(|e| e.to_string())?;
            释放嵌入目录(子目录, 目标根, 计数)?;
        } else if let Some(文件) = 项.as_file() {
            if let Some(父目录) = 目标.parent() {
                std::fs::create_dir_all(父目录).map_err(|e| e.to_string())?;
            }
            std::fs::write(&目标, 文件.contents()).map_err(|e| e.to_string())?;
            *计数 += 1;
        }
    }
    Ok(())
}

// 「开放 files」= Android 的 app 专属外部目录 `getExternalFilesDir(null)`：
//   /storage/emulated/0/Android/data/com.muimui.meownovels/files
// 它在文件管理器里**用户可见**（区别于内部私有的 files），不需要额外权限，
// 卸载应用时随之一起删除 —— 正好用来放「希望用户自己能看到 / 管理」的下载与用户资源。
//
// Tauri 没有直接暴露 getExternalFilesDir(null)，但一批 DIRECTORY_* 系列都是它的子目录
// （实测 Android 16 / Tauri 2.x）：
//   audioDir    → .../<包名>/files/Music
//   documentDir → .../<包名>/files/Documents
//   downloadDir → .../<包名>/files/Download
//   pictureDir  → .../<包名>/files/Pictures
//   publicDir   → .../<包名>/files/DCIM
// 取其中任一个的父目录即得开放 files 根。这里用 document_dir。
//
// ⚠️ **别用 video_dir**：实测它返回的是
//   /storage/emulated/0/Android/data/<包名>/cache
//   —— 外部 cache，而不是文档里写的 `.../files/Movies`。拿它取父目录会落到
//   **包目录本身**，于是 数据/ 会和 cache/ 并排建错一层（踩过）。
fn 开放文件根(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    use tauri::Manager;

    let 文档目录 = app
        .path()
        .document_dir()
        .map_err(|e| format!("无法解析开放存储路径：{e}"))?;
    文档目录
        .parent()
        .map(|p| p.to_path_buf())
        .ok_or_else(|| format!("开放存储路径异常：{}", 文档目录.display()))
}

/// 初始化应用存储（**幂等**，每次启动都可以调）。
///
/// 1. 把编译期嵌入的「初始数据」释放进私有 files/
/// 2. 在开放 files/ 下建好 `数据/下载`、`数据/导出`、`数据/用户资源`
///
/// 判据是**顶层目录是否存在**，而不是逐个文件判断：
///   · `私有/数据` 已存在 → 整棵「数据」跳过
///   · `私有/设置` 已存在 → 整棵「设置」跳过
/// 用目录级而不是文件级，是为了**用户刻意删掉的文件不会被复活** ——
/// 文件级判据会让每次启动都把用户删掉的初始文件补回来，非常恼人。
/// 代价：将来往初始数据里新增文件，老用户不会自动收到（那时要另做迁移/版本化）。
#[tauri::command]
fn 初始化应用存储(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    use tauri::Manager;

    // ── 私有空间：释放初始数据 ──
    let 私有根 = app
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("无法解析私有空间路径：{e}"))?
        .join("files");
    std::fs::create_dir_all(&私有根).map_err(|e| format!("无法创建私有空间目录：{e}"))?;

    let mut 已释放 = Vec::new();
    for 项 in 初始数据.entries() {
        let Some(子目录) = 项.as_dir() else { continue }; // 顶层只处理目录
        let 相对 = 项.path();
        if 私有根.join(相对).exists() {
            continue; // 该顶层目录已存在 → 视为「用户自己的数据」，整棵跳过
        }
        let mut 文件数 = 0usize;
        释放嵌入目录(子目录, &私有根, &mut 文件数)?;
        已释放.push(format!("{}（{} 个文件）", 相对.display(), 文件数));
    }

    for &相对 in 初始空目录 {
        std::fs::create_dir_all(私有根.join(相对)).map_err(|e| e.to_string())?;
    }

    // ── 开放空间：建好下载 / 导出 / 用户资源 ──
    let 开放根 = 开放文件根(&app)?;
    let mut 已建目录 = Vec::new();
    for 相对 in ["数据/下载", "数据/导出", "数据/用户资源"] {
        let 目标 = 开放根.join(相对);
        std::fs::create_dir_all(&目标).map_err(|e| format!("无法创建开放目录：{e}"))?;
        已建目录.push(目标.to_string_lossy().to_string());
    }

    Ok(serde_json::json!({
        "私有根": 私有根.to_string_lossy().to_string(),
        "开放根": 开放根.to_string_lossy().to_string(),
        "已释放": 已释放,
        "已建目录": 已建目录,
    }))
}

#[tauri::command]
async fn 设置暗色模式(_app: tauri::AppHandle, _启用: bool) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
fn 获取系统主题色() -> Result<String, String> {
    Err("Android 暂不支持系统主题色".into())
}

#[tauri::command]
fn 获取所有颜色() -> serde_json::Value {
    serde_json::json!({})
}

#[tauri::command]
async fn 选择文件或文件夹(_app: tauri::AppHandle) -> Result<String, String> {
    Err("Android 请使用系统选择器".into())
}

#[tauri::command]
async fn 打开调试窗口(_app: tauri::AppHandle) -> Result<(), String> {
    Ok(())
}

// 书源系统的「发起网络请求」—— 实现在跨平台共用的 `net.rs`。
// 这里只挂一个薄命令，**不要**把请求逻辑写进来：两端语义必须逐字一致。
#[tauri::command]
async fn 网络请求(选项: serde_json::Value) -> Result<serde_json::Value, String> {
    crate::net::发请求(选项).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn 打开窗口() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            检查文件是否存在,
            写入文件,
            读取文件,
            删除文件,
            列出目录,
            获取应用目录,
            私有空间根目录,
            初始化应用存储,
            设置暗色模式,
            获取系统主题色,
            获取所有颜色,
            选择文件或文件夹,
            打开调试窗口,
            网络请求
        ])
        .run(tauri::generate_context!())
        .expect("Android 端启动失败");
}
