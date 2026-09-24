//! 平台路由：按 target_os 选择性编译 platform.{win|android}.rs
#![allow(unused_imports)]

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
