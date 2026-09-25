import { createApp } from "vue";
import App from "./App.android.vue";
import "./styles";

console.log("喵小说 WebView (Android):", navigator.userAgent);
createApp(App).mount("#app");
