// 安卓端的文件访问：**优先走原生「选图 + 裁剪」**，不行才退回 Web 的
// `<input type="file">`（见 文件访问.share.js）。
//
// 为什么要有原生这条路：Web 的 input 只能「选」，用户选完没机会裁；而安卓原生
// 的裁剪界面（`com.android.camera.action.CROP`）根本不在 Web 的能力范围内。
// 适配定位：小米 / OPPO / vivo / 荣耀 —— 这几家的相册注册了这个 Intent。
// ⚠️ **它不是官方 API**，Google 原生 Pixel 没有、华为 EMUI 屏蔽；鸿蒙不做适配（刻意划的线）。
//
// 平台解析：引用写 `./文件访问` 时，vite 的 platformResolve 会优先命中本文件
// （`文件访问.android.js`）；share 版只作为兜底被下面显式 import。
import { 选择图片 as 网页选择图片, 压缩图片 } from "./文件访问.share.js";

// 原生桥在不在？PC / 浏览器 / 桥没挂上时都得能降级，所以每次都现查
function 有原生桥() {
    return (
        typeof window !== "undefined" &&
        !!window.安卓图片 &&
        typeof window.安卓图片.选择并裁剪 === "function"
    );
}

// 走原生：系统相册选图 → 系统裁剪界面（比例可定）→ data URL。
//
// 状态是三态，调用方靠它决定要不要降级：
//   '成功'         拿到地址了
//   '取消'         用户自己放弃的 —— **不该再弹一次选择器**
//   '不支持:原因'   这台机器没有可用的裁剪实现 → 该降级成「只选不裁」
//   ⚠️ 「不支持」后面可能带冒号+原因（如 `不支持:裁剪启动失败:ActivityNotFoundException`），
//     那是排障用的 —— 判断时必须用 startsWith，别写全等。
export function 原生选择并裁剪(比例宽 = 1, 比例高 = 1, 输出边长 = 512) {
    return new Promise((resolve) => {
        if (!有原生桥()) {
            resolve({ 地址: null, 状态: "不支持:没有原生桥" });
            return;
        }
        const 收尾 = (地址, 状态) => {
            delete window.__安卓裁剪结果;
            resolve({ 地址: 地址 || null, 状态: 状态 || (地址 ? "成功" : "不支持") });
        };
        // 原生侧回调的就是这个全局函数（见 MainActivity.kt 的 交回裁剪结果）
        window.__安卓裁剪结果 = 收尾;
        try {
            window.安卓图片.选择并裁剪(比例宽, 比例高, 输出边长);
        } catch {
            收尾(null, "不支持:桥调用抛错");
        }
    });
}

// 对外的「选一张图」：
//   · 有原生桥 → 先试原生（带裁剪界面）；只有原生说「不支持」才降级
//   · 没有原生桥（PC / 浏览器）→ 直接用 Web 选择器
// `裁剪: false` 用于「不需要用户裁」的场景（比如选一张封面），直接走 Web 那条。
export async function 选择图片({ 最大边 = 512, 质量 = 0.85, 裁剪 = true } = {}) {
    if (裁剪 && 有原生桥()) {
        const { 地址, 状态 } = await 原生选择并裁剪(1, 1, 最大边);
        // ⚠️ 原生的裁剪结果**不受我们控制质量**：`outputX/outputY` 只能定尺寸，
        // CROP 协议里**没有标准的 JPEG 质量参数** —— MIUI 会按很高的画质问输出，
        // 实测 512×512 竟然有 385 KB（≈ q95+），base64 后 526 KB。
        // 尺寸已经由裁剪器定好，这里再走一道 canvas 把质量压到目标值即可
        // （385 KB → ~50 KB）。用户拖的那个裁剪框不受影响，只是重编码一次。
        if (地址) {
            // 压缩失败也别把功能丢了 —— 退回原图（只是大一点）
            try {
                return await 压缩图片(地址, { 最大边, 质量 });
            } catch (错误) {
                console.warn("[文件访问] 压缩裁剪结果失败，退回原样", 错误);
                return 地址;
            }
        }
        // 「取消」到此为止 —— 用户主动放弃，再弹一次选择器很烦
        if (String(状态).startsWith("取消")) return null;
        // 落到这 = 这台机器没有可用的裁剪实现 → 往下走「只选不裁」
        console.warn(`[文件访问] 原生裁剪不可用（${状态}）→ 降级为「只选不裁」`);
    }
    return await 网页选择图片({ 最大边, 质量 });
}
