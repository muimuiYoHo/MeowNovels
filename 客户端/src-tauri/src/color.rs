use windows::core::HSTRING;
use windows::Win32::System::Registry::{
    RegCloseKey, RegOpenKeyExW, RegQueryValueExW, HKEY_CURRENT_USER, KEY_READ, REG_VALUE_TYPE,
};

fn 读取注册表颜色(路径: &str, 值名: &str) -> Option<String> {
    unsafe {
        let mut hkey = Default::default();
        let subkey = HSTRING::from(路径);

        if RegOpenKeyExW(HKEY_CURRENT_USER, &subkey, 0, KEY_READ, &mut hkey).is_err() {
            return None;
        }

        let value_name = HSTRING::from(值名);
        let mut data: u32 = 0;
        let mut data_size: u32 = 4;
        let mut kind = REG_VALUE_TYPE(0);

        let result = RegQueryValueExW(
            hkey,
            &value_name,
            None,
            Some(&mut kind),
            Some(&mut data as *mut u32 as *mut u8),
            Some(&mut data_size),
        );

        RegCloseKey(hkey).ok();

        if result.is_err() {
            return None;
        }

        let r = (data & 0xFF) as u8;
        let g = ((data >> 8) & 0xFF) as u8;
        let b = ((data >> 16) & 0xFF) as u8;

        Some(format!("#{:02X}{:02X}{:02X}", r, g, b))
    }
}

pub fn 获取主题色() -> String {
    读取注册表颜色(
        "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Accent",
        "AccentColorMenu",
    )
    .unwrap_or_else(|| "#6474B1".to_string())
}

pub fn 获取dwm颜色化颜色() -> Option<String> {
    读取注册表颜色("Software\\Microsoft\\Windows\\DWM", "ColorizationColor")
}

pub fn 获取dwm强调色() -> Option<String> {
    读取注册表颜色("Software\\Microsoft\\Windows\\DWM", "AccentColor")
}

pub fn 获取所有颜色信息() -> serde_json::Value {
    serde_json::json!({
        "AccentColorMenu": 获取主题色(),
        "ColorizationColor": 获取dwm颜色化颜色(),
        "AccentColor": 获取dwm强调色()
    })
}
