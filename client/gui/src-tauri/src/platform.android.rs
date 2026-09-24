// Android 平台实现（命令按需补齐；窗口壳走 Tauri 移动端默认）
#![allow(unused_variables)]

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

#[tauri::command]
fn 获取应用目录() -> Result<String, String> {
    let dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.to_string_lossy().to_string()));
    dir.ok_or_else(|| "无法获取应用目录".to_string())
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
            获取应用目录,
            设置暗色模式,
            获取系统主题色,
            获取所有颜色,
            选择文件或文件夹,
            打开调试窗口
        ])
        .run(tauri::generate_context!())
        .expect("Android 端启动失败");
}
