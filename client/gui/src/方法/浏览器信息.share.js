import { 错误码, 返回错误 } from './错误码';

// 查询当前 WebView 的引擎 / 环境信息。
//
// **按项索取，不是一次性返回全部**：
//   · UA-CH 的**高熵值**（型号、平台版本、架构…）会让浏览器多做一次计算，且属隐私敏感项，
//     不该在无关场景里顺手取走；
//   · 调用方通常只要一两项（「是不是 WebView」「内核是什么」），全量返回只会制造噪音。
//
// 外部接口
//   读取浏览器信息(项) —— **同步**，只覆盖 navigator / window 上现成的属性，零等待
//   查询浏览器信息(项) —— **异步**，同步项也认，另外能取需要向浏览器索取的高熵值

// ── 内核识别 ──
//
// 顺序有讲究：Chromium 系的 UA 里**同时**带 `Chrome/` 和 `Safari/` 标记，Edge 又带 `Chrome/`。
// 所以判断必须从最具体往下走，先匹配到的先返回 —— 反了就永远认成 Safari。
function 解析内核() {
    const 代理 = navigator.userAgent;
    const 版本 = (正则) => 代理.match(正则)?.[1] ?? '';
    if (/Edg\//.test(代理)) return { 名称: 'Edge (Chromium)', 版本: 版本(/Edg\/([\d.]+)/) };
    if (/OPR\//.test(代理)) return { 名称: 'Opera (Chromium)', 版本: 版本(/OPR\/([\d.]+)/) };
    if (/Chrome\//.test(代理)) return { 名称: 'Chromium', 版本: 版本(/Chrome\/([\d.]+)/) };
    if (/Firefox\//.test(代理)) return { 名称: 'Gecko', 版本: 版本(/Firefox\/([\d.]+)/) };
    if (/Safari\//.test(代理)) return { 名称: 'WebKit', 版本: 版本(/Version\/([\d.]+)/) };
    return { 名称: '', 版本: '' };
}

// ── 同步项：navigator / window 上现成的属性 ──
const 同步信息 = {
    用户代理: () => navigator.userAgent,
    内核: () => 解析内核().名称,
    内核版本: () => 解析内核().版本,
    // 只要主版本号（'143'）—— 完整串（'143.0.7499.192'）摆在页面上太长，
    // 而「够不够新」「和某个特性对不对得上」这类判断通常也只关心主版本。
    内核主版本: () => 解析内核().版本.split('.')[0],
    // `; wv`（wv = webview）是**安卓 WebView 专有**的标记。
    // 别拿它当「是不是 WebView」的通用判据 —— PC 端的 WebView2（Edge 内核）UA 里没有它，会误报 false。
    是否安卓WebView: () => /; wv/.test(navigator.userAgent),
    // 判断「是不是跑在我们自己的 Tauri 壳里」要用这个：Tauri 注入的运行时对象，
    // 两端都在（安卓 WebView / PC WebView2 都有）。实测 `typeof === 'object'`。
    是否Tauri壳: () => typeof window.__TAURI_INTERNALS__ === 'object',
    平台: () => navigator.platform || '',
    语言: () => navigator.language || '',
    语言列表: () => (navigator.languages || []).join('、'),
    时区: () => Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    像素比: () => devicePixelRatio,
    屏幕宽: () => screen.width,
    屏幕高: () => screen.height,
    视口宽: () => innerWidth,
    视口高: () => innerHeight,
    逻辑核心: () => navigator.hardwareConcurrency || 0,
    设备内存: () => navigator.deviceMemory || 0, // 非标准，Chromium 系才有
    触点数: () => navigator.maxTouchPoints || 0,
    是否触屏: () => (navigator.maxTouchPoints || 0) > 0,
    是否在线: () => navigator.onLine,
    是否暗色: () => window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false,
};

// ── 异步项：需要主动向浏览器索取（UA-CH 高熵值）──
//
// `navigator.userAgentData` 只有 Chromium 系有；拿高熵值必须显式调用，还可能被策略拒绝。
async function 取高熵值(键) {
    const 数据 = navigator.userAgentData;
    if (!数据?.getHighEntropyValues) {
        throw new Error('这个内核没有 userAgentData（高熵值只在 Chromium 系可用）');
    }
    const 结果 = await 数据.getHighEntropyValues([键]);
    const 值 = 结果?.[键];
    // fullVersionList 是 [{brand, version}] 数组，拍平成「品牌 版本」串
    if (Array.isArray(值)) return 值.map((项) => `${项.brand} ${项.version}`).join('、');
    return 值 ?? '';
}

const 异步信息 = {
    是否移动: () => navigator.userAgentData?.mobile ?? false,
    型号: () => 取高熵值('model'),
    平台版本: () => 取高熵值('platformVersion'),
    架构: () => 取高熵值('architecture'),
    位数: () => 取高熵值('bitness'),
    完整版本: () => 取高熵值('fullVersionList'),
};

// 同步查询。只认 同步信息 表；要异步项请用 查询浏览器信息。
export function 读取浏览器信息(项) {
    const 取值 = 同步信息[项];
    if (!取值) {
        // 两种「查不到」的提示必须分开，否则会把人带偏：
        // 一个是走错接口（该项存在但要异步取），一个是名字压根不存在。
        const 提示 = 异步信息[项]
            ? `「${项}」是异步项，改用 查询浏览器信息（它要主动向浏览器索取）`
            : `「${项}」没登记 —— 名字写错了，或者该项还没做`;
        return 返回错误(错误码.未登记浏览器信息, 提示);
    }
    try {
        return 取值();
    } catch (错误) {
        return 返回错误(错误码.浏览器信息不可用, `读「${项}」失败：${错误.message}`);
    }
}

// 异步查询。同步项直接给出（不绕异步），只有异步项才真去问浏览器。
export async function 查询浏览器信息(项) {
    if (同步信息[项]) return 读取浏览器信息(项);
    const 取值 = 异步信息[项];
    if (!取值) {
        return 返回错误(错误码.未登记浏览器信息, `「${项}」不在表里 —— 名字写错了，或者该项还没做`);
    }
    try {
        return await 取值();
    } catch (错误) {
        return 返回错误(错误码.浏览器信息不可用, `取「${项}」失败：${错误.message}`);
    }
}

// 一次取一批，省得写一长串 await。返回 { 项: 值 }。
export async function 查询浏览器信息表(项列表) {
    const 结果 = {};
    await Promise.all(
        项列表.map(async (项) => {
            结果[项] = await 查询浏览器信息(项);
        }),
    );
    return 结果;
}

// 调试用：看看有哪些项可以问
export function 列出可查询项() {
    return { 同步项: Object.keys(同步信息), 异步项: Object.keys(异步信息) };
}
