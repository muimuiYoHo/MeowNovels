import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

export async function 发送系统通知(标题, 内容) {
    try {
        let 授权了喵 = await isPermissionGranted();
        if (!授权了喵) {
            const 权限 = await requestPermission();
            授权了喵 = 权限 === 'granted';
        }
        if (授权了喵) {
            sendNotification({
                title: `${标题}`,
                body: `${内容}`,
                icon: '../../src-tauri/图标/icon.ico'
            });
        }
    } catch (e) {
        console.error('系统通知发送失败 -> ', e);
    }
}