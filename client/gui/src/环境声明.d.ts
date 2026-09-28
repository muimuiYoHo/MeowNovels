// 环境与资源类型声明。
//
// 【为什么需要这个文件】
// 本工程是「Vite + Vue，JS 为主」，没有装 typescript、也没有 tsconfig.json，
// 但 `src/资源/页面图标.ts` 是 TypeScript 文件 —— VS Code 会用内置的 TS 服务
// 给它做检查（推断项目）。而 TS 本身**不认识** `.svg` / `.vue` 这类非 JS 模块，
// 于是每一行 `import 图标 from "./图标/xxx.svg"` 都会报：
//     ts(2307) 找不到模块"./图标/xxx.svg"或其相应的类型声明
// 运行不受影响（svg 由 Vite 处理成 URL 字符串），但编辑器里满屏红线很难看。
//
// 这个文件把这些「Vite 知道怎么处理、TS 不知道」的模块补上声明即可。
//
// 【为什么是 .d.ts 而不是加 tsconfig.json】
// 加 tsconfig 会顺带开启一整套检查规则（strict、noImplicitAny…），
// 对一个以 JS 为主、只有零星 .ts 的工程来说，容易引出一堆与本次无关的报错。
// 只补声明文件是**最小改动**：老代码一行不动，只让编辑器认得出这些模块。

/// <reference types="vite/client" />

// 显式声明常见静态资源（不依赖上面那条 reference 是否被解析到 —— 双保险）。
// 类型都写成 string：Vite 把它们处理成**资源 URL**，
// 本工程正是拿这个 URL 去拼 CSS `mask` 的 `url("...")`。
declare module "*.svg" {
    const 资源地址: string;
    export default 资源地址;
}
declare module "*.png" {
    const 资源地址: string;
    export default 资源地址;
}
declare module "*.jpg" {
    const 资源地址: string;
    export default 资源地址;
}
declare module "*.webp" {
    const 资源地址: string;
    export default 资源地址;
}
declare module "*.ttf" {
    const 资源地址: string;
    export default 资源地址;
}
declare module "*.css";

// .vue 单文件组件：TS 同样不认识，需要声明默认导出是个组件。
declare module "*.vue" {
    import type { DefineComponent } from "vue";
    const 组件: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
    export default 组件;
}
