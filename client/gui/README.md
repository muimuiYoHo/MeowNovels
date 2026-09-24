# 喵小说 GUI（Tauri）

平台文件名标签选择性编译：逻辑引用 → `命名.{win|android|share}.ext`

## 目录

```text
src/
  main.win.js | main.android.js     # 入口（Vite 按 APP_PLATFORM 选）
  App.win.vue | App.android.vue     # 根组件（安卓整树重写，不迁 PC）
  styles.win.css | styles.android.css
  methods/
    更新设置.share.js               # 业务（双端同源，禁止复制两份）
    系统通知.win.js | 系统通知.android.js
  components/
    *.win.vue                       # PC 页（现壳）
    UI/选择按钮.share.vue
    icons/*.share.vue               # 纯图标
src-tauri/src/
  lib.rs                            # 仅 cfg 路由
  platform.win.rs | platform.android.rs
  color.rs                          # 仅 win 引用
```

## 约定

| 后缀 | 含义 |
|---|---|
| `.win.` | 仅 Windows/PC |
| `.android.` | 仅 Android |
| `.share.` | 双端同源；**零差异逻辑禁止再抄成 win/android** |

引用时写逻辑名（不带平台后缀）：

```js
import TitleBar from "./components/标题栏";
import { 更新设置 } from "./methods/更新设置";
```

## 构建

```powershell
$env:APP_PLATFORM = "win"       # 或 android
npm.cmd run dev                 # / build
npm.cmd run tauri dev           # / tauri android dev
```

- **工程根路径必须全 ASCII**（本仓 `D:\work\MeowNovels`）。
- 安卓页在 `App.android.vue` 起新写，对齐 `../ui-proto/android.html`。
