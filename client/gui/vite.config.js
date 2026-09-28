import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import fs from "node:fs";
import path from "node:path";

const host = process.env.TAURI_DEV_HOST;
const platform = process.env.APP_PLATFORM || "win"; // win | android
const tags = [platform, "share"];
const root = path.resolve(".");
const src = path.join(root, "src");

/** 文件名标签选择性编译：引用逻辑名 → 命名.{win|android|share}.ext */
function platformResolve() {
  return {
    name: "platform-resolve",
    enforce: "pre",
    resolveId(source, importer) {
      if (!source || source.startsWith("\0")) return null;
      if (/[.](win|android|share)[.]/.test(source)) return null;
      if (!source.startsWith(".") && !source.startsWith("/")) return null;

      const from = importer ? path.dirname(importer) : src;
      const logical = source.startsWith("/")
        ? path.join(root, source)
        : path.resolve(from, source);
      const trimmed = logical.replace(/\.(js|mjs|ts|vue|css)$/, "");

      for (const tag of tags) {
        for (const ext of ["", ".vue", ".js", ".mjs", ".ts", ".css"]) {
          const f = `${trimmed}.${tag}${ext}`;
          // 必须归一成正斜杠：Rollup 以 POSIX 路径作模块 ID，
          // 返回 Windows 反斜杠路径会让 SFC 的 <style> 子模块对不上，样式被静默丢弃
          if (fs.existsSync(f) && fs.statSync(f).isFile()) return f.replace(/\\/g, "/");
        }
      }
      return null;
    },
  };
}

export default defineConfig(async () => ({
  plugins: [
    platformResolve(),
    vue(),
    {
      name: "platform-html-entry",
      transformIndexHtml(html) {
        return html.replace(
          /src="\/src\/main[^"]*"/,
          `src="/src/main.${platform}.js"`
        );
      },
    },
  ],
  define: {
    __APP_PLATFORM__: JSON.stringify(platform),
  },
  build: {
    // 关掉清空 dist：本机（WorkBuddy 环境）的 safe-delete 垫片会把 vite 的
    // emptyDir 转去回收站，累积超过阈值后报 SAFE_DELETE_BULK_CONFIRM_REQUIRED /
    // "genie-trash failed" 让整个 build 失败。关掉后靠产物哈希天然规避旧文件混淆。
    emptyOutDir: false,
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    // 真机热更走纯 USB 回环：必须是 127.0.0.1，不能是 localhost（Node 17+ 解析成 IPv6 ::1，
    // 而 adb reverse 隧道与 Tauri 探测都走 IPv4 → 死等），也不能是 0.0.0.0
    // （0.0.0.0 会让 Vite 只列出一个局域网 IP，127.0.0.1 上反而没有服务，adb reverse 连不上）。
    host: host || "127.0.0.1",
    hmr: host
      ? { protocol: "ws", host, port: 1421 }
      : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
}));
