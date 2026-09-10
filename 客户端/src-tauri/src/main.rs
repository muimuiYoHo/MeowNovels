// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // 在 main 函数中最早设置便携式环境变量
    设置便携式环境变量();
    app_lib::打开窗口();
}

// 获取 exe 所在目录
fn 获取exe目录() -> std::path::PathBuf {
    std::env::current_exe()
        .expect("无法获取exe路径")
        .parent()
        .expect("无法获取exe目录")
        .to_path_buf()
}

// 设置便携式数据目录环境变量
fn 设置便携式环境变量() {
    let exe目录 = 获取exe目录();
    let 数据目录 = exe目录.join("数据");
    let 缓存目录 = exe目录.join("缓存");
    let 日志目录 = exe目录.join("日志");

    // 创建目录
    let _ = std::fs::create_dir_all(&数据目录);
    let _ = std::fs::create_dir_all(&缓存目录);
    let _ = std::fs::create_dir_all(&日志目录);

    // 设置 WebView2 数据目录（缓存）
    std::env::set_var("WEBVIEW2_DEFAULT_FOLDER", 缓存目录.to_string_lossy().to_string());

    // 设置 Tauri 数据目录
    std::env::set_var("TAURI_APPDATA_DIR", 数据目录.to_string_lossy().to_string());
    std::env::set_var("TAURI_APP_CACHE_DIR", 缓存目录.to_string_lossy().to_string());
    std::env::set_var("TAURI_APP_LOG_DIR", 日志目录.to_string_lossy().to_string());
}
