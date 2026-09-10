# 喵小说

轻小说资源获取与管理：命令行下载器 + 桌面客户端壳 + 资源服务端对接文档。

## 工作区结构

| 目录 | 角色 | 成熟度 |
|---|---|---|
| `CLI工具/` | Node CLI：wenku8 / esjzone 搜索下载，对接资源后端 | 生产可用 |
| `客户端/` | Tauri + Vue 桌面壳（复用旧喵番壳，已改喵小说身份） | 骨架 / 占位页 |
| `UI原型/` | PC Fluent + 安卓 Telegram 双端 UI 设计原型 | 设计完成 |
| `接口文档.md` | 资源服务端 HTTP 接口约定 | 可用 |
| `部署说明.md` | 服务端 Docker / nginx 部署与安全边界 | 可用（源码不在本仓） |

## 快速入口

```bash
# CLI
cd CLI工具 && npm start

# 桌面客户端（需已装 Rust / Tauri 依赖）
cd 客户端 && npm install && npm run tauri dev

# UI 原型预览
cd UI原型 && node server.js   # http://localhost:8787
```

## 产品边界

- **喵小说（本仓）**：轻小说搜索 / 下载 / 后端资源库同步 / 桌面 GUI。
- **喵番（`D:\work\喵番`）**：另一独立产品（动漫向桌面壳历史源）。本仓 `客户端/` 仅复用其 Tauri 壳代码，**不是**喵番本体。
- **资源服务端**：代码与库盘不在本工作区；对接地址见 `CLI工具/设置.json` 与 `部署说明.md`。

## 注意

- `CLI工具/账号.json` 含站点登录信息，已被 gitignore，勿提交。
- CLI 暂无测试 / lint；改动后至少跑通一次主流程。
