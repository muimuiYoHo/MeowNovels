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
          if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
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
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? { protocol: "ws", host, port: 1421 }
      : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
}));
