import { createApp } from "vue";
import { invoke } from "@tauri-apps/api/core";
import App from "./App.android.vue";
import "./styles";

console.log("喵小说 WebView (Android):", navigator.userAgent);

// 挂载前先让 Rust 把存储准备好：释放「初始数据」到私有 files/、建好开放 files/ 的目录。
//
// 必须 await（不能 fire-and-forget）：设置页在 mounted 里就会读设置，
// 如果初始化还没跑完，前端会先按自己的兜底默认值写一份到盘上，
// Rust 随后看到「目录已存在」就整棵跳过 —— 结果是盘上留下前端那份旧结构。
// 初始化失败不阻断启动：各读写接口本身都有兜底。
(async () => {
    try {
        const 结果 = await invoke("初始化应用存储");
        console.log("存储初始化：", 结果);
    } catch (错误) {
        console.warn("存储初始化失败（不阻断启动）：", 错误);
    }
    createApp(App).mount("#app");
})();
