import { invoke } from '@tauri-apps/api/core';

// 原生网络接口 PC
//
// PC 端只有 Rust 一条路 安卓那条 Kotlin 桥复用的是系统 CookieManager
// PC 的 WebView2 没有对等物 硬做一个只会让两端行为分叉
// 所以这里不提供后端切换 形状与安卓侧保持一致即可

export const 网络设置 = { 后端: 'rust' };

export function 解码base64(文本) {
    const 二进制 = atob(文本 || '');
    const 字节 = new Uint8Array(二进制.length);
    for (let i = 0; i < 二进制.length; i++) 字节[i] = 二进制.charCodeAt(i);
    return 字节;
}
const base64转字节 = 解码base64;

export async function 发起请求(选项) {
    const 用选项 = { 方法: 'GET', 不跟随重定向: false, 超时毫秒: 30000, ...选项 };
    try {
        const 原始结果 = await invoke('网络请求', { 选项: 用选项 });
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

export async function 发起文本请求(选项) {
    const 结果 = await 发起请求(选项);
    if (!结果.成功) return 结果;
    try {
        结果.文本 = new TextDecoder(选项?.编码 || 'utf-8').decode(结果.原始);
    } catch {
        结果.文本 = new TextDecoder('utf-8').decode(结果.原始);
    }
    return 结果;
}

// PC 端没有过挑战能力 cf_clearance 必须由 WebView 的 JS 引擎种进 CookieManager
// 而 PC 的 WebView2 没有和安卓对等的可用接口
// 这里返失败 让 工具.js 的调用方按过不了处理 不抛错
// 因为过不了挑战只是降级 后面那次请求会照常失败 不该把源整个打挂
export async function 过挑战(地址, 选项 = {}) {
    return { 成功: false, 错误: `PC 端没有过挑战能力（${地址}）` };
}

// PC 端没有系统 CookieManager 可同步 WebView2 无对等物 这两个是空实现
// 形状必须与安卓一致 工具.js 无条件调用它们
export async function 同步Cookie进WebView(地址, cookie串) {
    return { 成功: false, 错误: 'PC 端没有该能力' };
}
export async function 清WebViewCookie(地址) {
    return { 成功: false, 错误: 'PC 端没有该能力' };
}
