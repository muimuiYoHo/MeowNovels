# MeowNovels（喵小说）

轻小说资源获取与管理。仓库路径 **全 ASCII**（`D:\work\MeowNovels`），供 Tauri 安卓编译使用。

## 结构

```text
client/
  cli/        # Node 下载器（wenku8 / esjzone）
  gui/        # Tauri 桌面 + 安卓壳（平台后缀选择性编译）
  ui-proto/   # 双端 UI 设计原型（pc.html / android.html）
server/
  app/        # 资源服务端 Node
  nginx/
  api.md / deploy.md
docs/         # api.md / deploy.md（与 server 文档同步）
experiments/  # 液态玻璃等实验（不参与产品构建）
```

## GUI 平台后缀约定

| 后缀 | 含义 |
|---|---|
| `*.win.*` | 仅 Windows/PC |
| `*.android.*` | 仅 Android |
| `*.share.*` | 双端同源业务 |

引用写逻辑名，由 `client/gui/vite.config.js` 解析后缀。详见 `client/gui/README.md`。

## 快速入口

```powershell
# CLI
cd client/cli; node src/gui.js

# GUI（Windows）
cd client/gui
$env:APP_PLATFORM = "win"
npm.cmd run tauri dev

# GUI（Android 前端预览）
$env:APP_PLATFORM = "android"
npm.cmd run dev

# 服务端
cd server/app; node src/主.js

# UI 原型
cd client/ui-proto; node server.js
```

## 注意

- **禁止把本仓放回中文路径**（安卓 Gradle/NDK 会挂）。
- `client/cli/账号.json` 含登录信息，已 gitignore。
- 安卓 Vue 页在 `App.android.vue` 起新写，对齐 `client/ui-proto/android.html`，不要移植 PC 树。
