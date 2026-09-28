import { 错误码, 返回错误 } from "./错误码";

// 轻提示（toast）—— 两种实现，按场合选：
//   · 私有吐司(类型, 内容)：应用自己画的（DOM + CSS）。跟 UI 风格一致，样式 / 位置 / 时长全能调。
//   · 安卓吐司(内容, 时长)：调系统原生 Toast。样式改不了，但**不依赖 WebView 渲染** ——
//     页面白屏、主线程卡住也弹得出来，而且一定盖在所有东西之上。
//   拿不准就用 私有吐司；只有「页面可能已经不正常、但必须让用户看到」时才用 安卓吐司。
//
// 下面这一大段说明的是**私有吐司**的实现选择。
//
// ── 为什么走纯 DOM、不进 Vue 组件树 ──
//   · 接口是函数式的 吐司(类型, 内容) —— 任何模块（包括不在组件里的代码）都能直接调；
//   · 不必在 App 里挂容器、不必逐层传实例引用、不必管组件生命周期；
//   · 节点挂在 document.body 上并定位 fixed，**不会**被 .页 / .子页层 的
//     overflow: hidden 裁掉，也不会被它们的 transform 带着跑。
//     挂在组件树里就得挨个考虑这些祖先。
//
// 样式在 src/styles/吐司.css（由 styles.android.css / styles.win.css 各自引入），
// 本文件只管 DOM 与计时。

// 类型表。**只有这里登记的类型才认**（全中文，和项目其它枚举一致）。
// 以后要加「警告」之类，在这里加一行就够。
export const 吐司类型 = {
    成功: "成功",
    失败: "失败",
    提示: "提示",
};

const 默认时长 = 2200; // 停留时长（毫秒）
const 退场时长 = 260; // 摘节点的等待时长，**略大于** CSS 里的过渡时长（.22s）—— 保证动画播完再摘
const 同屏上限 = 3; // 同时最多挂几条，超了挤掉最老的

let 容器 = null;

// 容器可能被外部摘掉（整页重建、HMR 重挂载），所以每次用前确认还在，不在就重建
function 取容器() {
    if (容器 && document.body.contains(容器)) return 容器;
    容器 = document.createElement("div");
    容器.className = "吐司容器";
    document.body.appendChild(容器);
    return 容器;
}

/**
 * 私有吐司：应用自己画的轻提示。
 *
 * @param {string} 类型 成功 / 失败 / 提示（见 吐司类型）
 * @param {string} 内容 给用户看的文字
 * @returns {boolean} 类型是否登记过；传了未登记的类型会返回 false，**但内容照常显示**
 */
export function 私有吐司(类型, 内容) {
    if (typeof document === "undefined") return false; // 非浏览器环境（构建期 / SSR）直接跳过

    const 已登记 = Object.prototype.hasOwnProperty.call(吐司类型, 类型);
    if (!已登记) {
        // 类型写错不该让提示消失 —— 降级成「提示」照常显示，同时把错记进 最近错误。
        // 与其它模块同一口径：给兜底值 + 旁路报错，别让参数写错变成信息丢失。
        返回错误(错误码.未登记吐司类型, `「${类型}」不在 吐司类型 表里，已按「提示」显示：${内容}`);
    }

    const 层 = 取容器();
    const 节点 = document.createElement("div");
    节点.className = `吐司 吐司-${已登记 ? 类型 : 吐司类型.提示}`;
    节点.textContent = String(内容 ?? "");
    层.appendChild(节点);

    // 入场必须**下一帧**再加「显示」类：元素诞生那一帧就已经带着终态的话，
    // 浏览器拿不到过渡起点，动画根本不播（同「过渡起点丢失」那一族坑）。
    requestAnimationFrame(() => 节点.classList.add("显示"));

    // 挤掉超量的旧提示（从最老的开始）
    while (层.children.length > 同屏上限) 层.firstElementChild.remove();

    setTimeout(() => {
        节点.classList.remove("显示");
        setTimeout(() => 节点.remove(), 退场时长);
    }, 默认时长);

    return 已登记;
}

// 一次清掉当前所有私有提示（比如整页/子页切换时，不想让旧提示飘到新页面上）
export function 清空吐司() {
    if (容器) 容器.replaceChildren();
}

// ── 原生 Toast ──

/**
 * 安卓吐司：调系统原生 Toast。桥由 gen/ 的 MainActivity.kt 注入成 window.安卓吐司。
 *
 * **什么时候该用它**：页面可能已经不正常了（白屏、主线程卡死、WebView 出问题）——
 * 原生 Toast 是独立窗口，只要进程活着就弹得出来，不依赖 WebView 渲染。
 * **代价**：样式 / 位置 / 时长全都改不了，就是系统那个黑底白字、固定在底部、长文本会被截断。
 *
 * 非安卓环境（PC / 浏览器）没有这座桥 → **自动降级到 私有吐司**，调用方不用写平台分支。
 *
 * @param {string} 内容 要给用户看的文字
 * @param {"短"|"长"} 时长 系统只有这两档，传其它值一律按「短」
 * @returns {boolean} 是否真的走了原生；降级时返回 false
 */
export function 安卓吐司(内容, 时长 = "短") {
    const 桥 = typeof window === "undefined" ? null : window.安卓吐司;
    const 文字 = String(内容 ?? "");

    if (!桥 || typeof 桥.显示 !== "function") {
        返回错误(错误码.原生吐司不可用, `当前环境没有 安卓吐司 桥（PC / 浏览器？），已降级为 私有吐司：${文字}`);
        私有吐司(吐司类型.提示, 文字);
        return false;
    }

    try {
        桥.显示(文字, 时长 === "长" ? "长" : "短");
        return true;
    } catch (错误) {
        // 桥在、但调用抛了（页面被换掉、签名变了…）→ 同样降级，别让提示彻底丢
        返回错误(错误码.原生吐司不可用, `调用原生吐司失败（${错误.message}），已降级为 私有吐司：${文字}`);
        私有吐司(吐司类型.提示, 文字);
        return false;
    }
}
