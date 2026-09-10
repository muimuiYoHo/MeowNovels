#[cfg(target_os = "windows")]
mod color;

use std::fs;
use std::path::Path;
use tauri::Manager;

#[cfg(target_os = "windows")]
fn 设置窗口样式(hwnd: windows::Win32::Foundation::HWND) {
    use windows::Win32::Graphics::Dwm::{
        DwmSetWindowAttribute, DWMWA_WINDOW_CORNER_PREFERENCE, DWMWCP_ROUND,
    };

    unsafe {
        let preference: u32 = DWMWCP_ROUND.0 as u32;
        let _ = DwmSetWindowAttribute(
            hwnd,
            DWMWA_WINDOW_CORNER_PREFERENCE,
            &preference as *const u32 as *const _,
            std::mem::size_of::<u32>() as u32,
        );
    }
}

#[tauri::command]
#[cfg(target_os = "windows")]
async fn 设置暗色模式(app: tauri::AppHandle, 启用: bool) -> Result<(), String> {
    use windows::Win32::Graphics::Dwm::{
        DwmSetWindowAttribute, DWMWA_USE_IMMERSIVE_DARK_MODE,
    };
    if let Some(窗口) = app.get_webview_window("main") {
        if let Ok(hwnd) = 窗口.hwnd() {
            let hwnd = windows::Win32::Foundation::HWND(hwnd.0 as isize);
            unsafe {
                let value: i32 = if 启用 { 1 } else { 0 };
                let _ = DwmSetWindowAttribute(
                    hwnd,
                    DWMWA_USE_IMMERSIVE_DARK_MODE,
                    &value as *const i32 as *const _,
                    std::mem::size_of::<i32>() as u32,
                );
            }
        }
    }
    Ok(())
}

#[tauri::command]
#[cfg(not(target_os = "windows"))]
async fn 设置暗色模式(_app: tauri::AppHandle, _启用: bool) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
fn 检查文件是否存在(路径: String) -> bool {
    Path::new(&路径).exists()
}

#[tauri::command]
fn 写入文件(路径: String, 内容: String) -> Result<(), String> {
    if let Some(父目录) = Path::new(&路径).parent() {
        if !父目录.exists() {
            fs::create_dir_all(父目录).map_err(|e| e.to_string())?;
        }
    }
    fs::write(&路径, 内容).map_err(|e| e.to_string())
}

#[tauri::command]
fn 读取文件(路径: String) -> Result<String, String> {
    fs::read_to_string(&路径).map_err(|e| e.to_string())
}

#[tauri::command]
fn 获取应用目录() -> Result<String, String> {
    let exe路径 = std::env::current_exe().map_err(|e| e.to_string())?;
    let exe目录 = exe路径.parent().ok_or("无法获取exe目录")?;
    Ok(exe目录.to_string_lossy().to_string())
}

#[tauri::command]
#[cfg(target_os = "windows")]
fn 获取系统主题色() -> Result<String, String> {
    Ok(color::获取主题色())
}

#[tauri::command]
#[cfg(not(target_os = "windows"))]
fn 获取系统主题色() -> Result<String, String> {
    Err("仅支持Windows".to_string())
}

#[tauri::command]
#[cfg(target_os = "windows")]
fn 获取所有颜色() -> serde_json::Value {
    color::获取所有颜色信息()
}

#[tauri::command]
#[cfg(not(target_os = "windows"))]
fn 获取所有颜色() -> serde_json::Value {
    serde_json::json!({})
}

#[tauri::command]
async fn 选择文件或文件夹(app: tauri::AppHandle) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;

    let 结果 = app
        .dialog()
        .file()
        .add_filter("所有文件", &["*"])
        .blocking_pick_file();

    match 结果 {
        Some(路径) => Ok(路径.to_string()),
        None => Err("未选择".to_string()),
    }
}

#[cfg(desktop)]
#[tauri::command]
async fn 打开调试窗口(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::WebviewUrl;
    use tauri::WebviewWindowBuilder;

    if app.get_webview_window("debug").is_some() {
        return Ok(());
    }

    let mut 逻辑宽度 = 640.0;
    let mut 逻辑高度 = 320.0;

    if let Some(主窗口) = app.get_webview_window("main") {
        if let Some(显示器) = 主窗口.current_monitor().ok().flatten() {
            let 缩放倍率 = 显示器.scale_factor();
            let 尺寸 = 显示器.size();
            逻辑宽度 = (尺寸.width as f64 * 0.5 / 缩放倍率).max(640.0);
            逻辑高度 = (尺寸.height as f64 * 0.5 / 缩放倍率).max(320.0);
        }
    }

    WebviewWindowBuilder::new(&app, "debug", WebviewUrl::App("/调试.html".into()))
        .title("调试窗口")
        .inner_size(逻辑宽度, 逻辑高度)
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[cfg(not(desktop))]
#[tauri::command]
async fn 打开调试窗口(_app: tauri::AppHandle) -> Result<(), String> {
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn 打开窗口() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            检查文件是否存在,
            写入文件,
            读取文件,
            获取应用目录,
            获取系统主题色,
            获取所有颜色,
            选择文件或文件夹,
            打开调试窗口,
            设置暗色模式
        ])
        .setup(|应用| {
            if let Some(窗口) = 应用.get_webview_window("main") {
                #[cfg(debug_assertions)]
                let 窗口显示计时 = std::time::Instant::now();

                #[cfg(desktop)]
                {
                    use tauri::window::Color;
                    let _ = 窗口.set_background_color(Some(Color(255, 255, 255, 0)));

                    // 设置Windows圆角 边框交给DWM自动处理
                    #[cfg(target_os = "windows")]
                    {
                        if let Ok(hwnd) = 窗口.hwnd() {
                            let hwnd = windows::Win32::Foundation::HWND(hwnd.0 as isize);
                            设置窗口样式(hwnd);
                        }
                    }

                    if let Some(显示器) = 窗口.current_monitor().ok().flatten() {
                        let 缩放倍率 = 显示器.scale_factor();
                        let 尺寸 = 显示器.size();
                        let 宽 = (尺寸.width as f64 * 0.6 / 缩放倍率) as f64;
                        let 高 = (尺寸.height as f64 * 0.6 / 缩放倍率) as f64;
                        let 最终宽 = 宽.max(640.0);
                        let 最终高 = 高.max(432.0);
                        let 逻辑尺寸 = tauri::LogicalSize {
                            width: 最终宽,
                            height: 最终高,
                        };
                        let _ = 窗口.set_size(tauri::Size::Logical(逻辑尺寸));
                        let _ = 窗口.center();
                    }

                    let _ = 窗口.show();
                }

                #[cfg(debug_assertions)]
                println!("主窗口隐藏初始化耗时: {:?}", 窗口显示计时.elapsed());
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("运行 Tauri 应用时出错");
}
