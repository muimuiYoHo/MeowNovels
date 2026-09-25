import { createApp } from "vue";
import App from "./App.win.vue";
import "./styles";

console.log("喵小说 WebView (Windows):", navigator.userAgent);
createApp(App).mount("#app");
