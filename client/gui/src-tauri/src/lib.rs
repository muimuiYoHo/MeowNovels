//! 平台路由：按 target_os 选择性编译 platform.{win|android}.rs
#![allow(unused_imports)]

// 跨平台共用模块（不依赖 tauri，两端行为必须逐字一致的那种）
//
// 🔴 文件名/模块名**必须是 ASCII** —— `mod 网络;` + `网络.rs` 会直接编译失败：
//    `error[E0754]: trying to load file for module 网络 with non-ascii identifier name`。
//    编译器的这条限制只针对**模块名**；里面的函数名、变量名照常可以用中文
//    （本文件里 `net.rs` 的 `发请求`、`客户端` 都是中文）。
pub mod net;

#[cfg(target_os = "windows")]
#[path = "platform.win.rs"]
mod platform;

#[cfg(target_os = "android")]
#[path = "platform.android.rs"]
mod platform;

#[cfg(not(any(target_os = "windows", target_os = "android")))]
#[path = "platform.android.rs"]
mod platform;

pub use platform::*;
