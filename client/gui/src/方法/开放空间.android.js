// 本喵开放空间 安卓应用专属外部目录的父目录
//
//   包目录
//     files   getExternalFilesDir(null) 用户能在文件管理器里看到 下面有 数据/下载 导出 用户资源
//     cache   外部缓存目录 系统可清理
//
// 与私有空间 /data/user/0/包名/files 的区别 私有空间别的应用看不见
// 这里连文件管理器都能进去 所以下载导出这种用户要自己拿走的文件放这
//
// 本模块里的相对路径一律相对上面那个包目录 例如 files/数据/下载 和 cache
// 前端因此永远不用碰 /storage/emulated/0 这种机器相关绝对路径 只在原生侧解析一次
//
// 为什么走 Kotlin 桥 window.安卓目录 而不是 Rust invoke
//   getExternalFilesDir 是 Context 的 API Java 侧直接可用 Rust 只能间接推导
//   用文件管理器打开目录要发 Intent 本身就得在主线程走 Activity
//
// PC 和浏览器上没有这个桥 用 支持开放空间 判断 别直接调

// 桥是否可用 所有函数都先过这道闸 缺失时静默降级 返空或失败 不抛异常
export function 支持开放空间() {
    return typeof window !== "undefined" && !!(window.安卓目录 && typeof window.安卓目录.列子目录 === "function");
}

// ─────────────── 目录描述符 ───────────────
//
// 全项目统一用这两种形状表示一个目录
//
//   { 类型: '空间', 路径: 'files/数据/下载' }                 本喵开放空间内 真实路径
//   { 类型: '授权', uri: 'content://...', 名称: 'Download' }  用户 SAF 授权的任意目录
//
// 为什么必须分类型 不能统一成字符串
// 授权目录拿到的根本不是路径 java.io.File 和 Rust 的 std::fs 全都用不了
// 只能走 ContentResolver 把它当路径存下去 要到写文件时写不进去才会发现

export function 空间目录(路径) {
    return { 类型: "空间", 路径 };
}

export function 是空间目录(描述符) {
    return 描述符?.类型 === "空间";
}

export function 是授权目录(描述符) {
    return 描述符?.类型 === "授权";
}

// 本喵开放空间的绝对路径 拿不到返空串
export function 开放空间根() {
    if (!支持开放空间()) return "";
    try {
        return window.安卓目录.根路径() || "";
    } catch {
        return "";
    }
}

// 列出某个相对路径下的子目录名 不存在 不是目录 桥不可用 都返空数组
export function 列子目录(相对路径 = "") {
    if (!支持开放空间()) return [];
    try {
        const 文本 = window.安卓目录.列子目录(相对路径) || "";
        return 文本 ? 文本.split("\n").filter(Boolean) : [];
    } catch {
        return [];
    }
}

// 建目录 含中间层 返 成功 和 状态 状态是 成功 已存在 失败原因
export function 建目录(相对路径) {
    if (!支持开放空间()) return { 成功: false, 状态: "失败:当前平台不支持" };
    try {
        const 状态 = window.安卓目录.建目录(相对路径) || "失败:无返回";
        return { 成功: !String(状态).startsWith("失败"), 状态 };
    } catch (错误) {
        return { 成功: false, 状态: `失败:${错误?.message ?? "未知"}` };
    }
}

// 用系统的文件应用打开该目录 返 成功 和 状态
//
// 返回值只代表 校验通过 请求已发出 真正的 startActivity 在主线程异步执行
// 失败 比如这台机器没有能浏览目录的应用 由原生侧弹吐司告知
export function 打开目录(相对路径) {
    if (!支持开放空间()) return { 成功: false, 状态: "失败:当前平台不支持" };
    try {
        const 状态 = window.安卓目录.打开目录(相对路径) || "失败:无返回";
        return { 成功: !String(状态).startsWith("失败"), 状态 };
    } catch (错误) {
        return { 成功: false, 状态: `失败:${错误?.message ?? "未知"}` };
    }
}

// ─────────────── SAF 手机里任意位置 ───────────────
//
// 有限的任意位置 SAF 的授权范围由用户在系统选择器里划定
// 他选哪个文件夹 我们才拿到哪个文件夹的读写权限 应用无从越界
// 代价是拿到的是 content:// URI 而非路径 见上面的目录描述符

// 拉起系统目录选择器 异步 用户取消时 uri 为空串
// 返 uri 名称 状态 状态为 成功 取消 失败原因
export function 选目录() {
    return new Promise((resolve) => {
        if (!支持开放空间() || typeof window.安卓目录.选目录 !== "function") {
            resolve({ uri: "", 名称: "", 状态: "失败:当前平台不支持" });
            return;
        }
        const 收尾 = (uri, 名称, 状态) => {
            delete window.__安卓选目录结果;
            resolve({ uri: uri || "", 名称: 名称 || "", 状态: 状态 || (uri ? "成功" : "取消") });
        };
        // 原生侧回调的就是这个全局函数 见 MainActivity.kt 的 交回选目录结果
        window.__安卓选目录结果 = 收尾;
        try {
            window.安卓目录.选目录();
        } catch {
            收尾(null, "", "失败:桥调用异常");
        }
    });
}

// 打开 SAF 授权目录的实际落点 父目录下的子目录
//
// 传 tree URI 加子目录名 不是落点 URI 原生侧要拿这两个才能目录被删了就地重建
// tree 到 document 的转换在原生侧做 直接交 tree URI 文件管理器 至少 MIUI
// 认不出 tree 形态 会静默退到自己的默认目录还不报错
export function 打开授权目录(uri, 子目录 = "") {
    if (!支持开放空间() || typeof window.安卓目录.打开授权目录 !== "function") {
        return { 成功: false, 状态: "失败:当前平台不支持" };
    }
    try {
        const 状态 = window.安卓目录.打开授权目录(uri, 子目录) || "失败:无返回";
        return { 成功: !String(状态).startsWith("失败"), 状态 };
    } catch (错误) {
        return { 成功: false, 状态: `失败:${错误?.message ?? "未知"}` };
    }
}

// 在授权目录下确保存在名为 名 的子目录 返它的 document URI 失败返空串
//
// 为什么要子目录 用户在设置里选的是父目录 实际文件落到 父目录/名 下
// 这样自定义目录和默认结构 files/数据/下载 files/数据/导出 是对称的
// 幂等 同名目录已存在就直接返回 不会重复建
//
// 返回的这个 URI 才是真正的写入落点 存储它 往里写文件都走它
// 只支持 ContentResolver 那套 openOutputStream createDocument File 用不了
export function 确保子目录(uri, 名) {
    if (!支持开放空间() || typeof window.安卓目录.确保子目录 !== "function") return "";
    try {
        return window.安卓目录.确保子目录(uri, 名) || "";
    } catch {
        return "";
    }
}

// ─────────────── 往目录里写文件 ───────────────
//
// 两种模式各一条路 由 写文本到 统一分派
// 将来的下载和导出都该走这个入口 不要各自去判断类型 判断漏了就会在授权目录上静默写失败

// 写进开放空间 相对路径相对包目录 返 成功 和 状态
export function 写空间文件(相对路径, 文件名, 内容) {
    if (!支持开放空间() || typeof window.安卓目录.写空间文件 !== "function") {
        return { 成功: false, 状态: "失败:当前平台不支持" };
    }
    try {
        const 状态 = window.安卓目录.写空间文件(相对路径, 文件名, 内容) || "失败:无返回";
        return { 成功: !String(状态).startsWith("失败"), 状态 };
    } catch (错误) {
        return { 成功: false, 状态: `失败:${错误?.message ?? "未知"}` };
    }
}

// 写进 SAF 授权目录的落点 返 成功 和 状态
//
// 同样传 tree URI 加子目录名 目录被删了会自动重建 用户可能手动删掉那个文件夹
// 而不是报一个目录不存在让他自己去折腾
export function 写授权文件(uri, 子目录, 文件名, 内容) {
    if (!支持开放空间() || typeof window.安卓目录.写授权文件 !== "function") {
        return { 成功: false, 状态: "失败:当前平台不支持" };
    }
    try {
        const 状态 = window.安卓目录.写授权文件(uri, 子目录 ?? "", 文件名, 内容) || "失败:无返回";
        return { 成功: !String(状态).startsWith("失败"), 状态 };
    } catch (错误) {
        return { 成功: false, 状态: `失败:${错误?.message ?? "未知"}` };
    }
}

// 统一入口 往任意目录描述符写一个文本文件 返 成功 和 状态
//
// 两种模式在这里分派 将来下载导出都该走这个入口 别各自判断类型
// 判断漏了会在授权目录上静默写失败
// 两边都会按需重建目录 空间模式 mkdirs 授权模式走 确保子目录
export function 写文本到(描述符, 文件名, 内容) {
    if (是授权目录(描述符)) {
        return 写授权文件(描述符.uri, 描述符.子目录, 文件名, 内容);
    }
    return 写空间文件(描述符?.路径 ?? "", 文件名, 内容);
}
