// 本模块是私有空间的唯一出口 目录结构 路径拼接 读写全收在这里
import { invoke } from '@tauri-apps/api/core';
//   私有空间根目录 = /data/user/0/com.muimui.meownovels/files
//
// 调用方法 读取文件(私有目录.设置, '应用设置') 就够了 不许在别处拼路径字符串
// 因为路径拼错在安卓上不会报错 只会静默写出一个名字很怪的文件 读回空值
//
// 平台拆

// 私有空间的固定结构 要加目录就往这里加 别在调用处硬写字符串
//   数据 业务数据 书架 缓存索引 丢了只是体验降级
//   设置 用户设置 应用设置.json 丢了要能靠默认值重建
export const 私有目录 = {
    数据: '数据',
    设置: '设置',
    // 用户资源 换过的头像等 放 数据 下 丢了只是体验降级
    // 单独一个目录是为了别让图片混进 JSON 数据文件里 体积大又不该被整份读写
    // 与打包的 初始数据/数据/用户资源/ 同名同构
    // 所以数据里的相对路径两边通用 私有侧有同名文件就自然盖住出厂那张
    // 已知分工 账号头像 是平台账号 个人头像 是未来的喵小说账号
    用户资源: '数据/用户资源',
};

// 私有空间根目录由 Rust 命令 私有空间根目录 给出 它负责按平台解析并建好目录
// 运行期不变 取一次就够 每次 invoke 都是一次 IPC
// 取根目录中的 给并发调用去重 首屏多个组件同时读设置时只发一次请求
let 私有根目录缓存 = null;
let 取根目录中的 = null;

async function 取私有根目录() {
    if (私有根目录缓存) return 私有根目录缓存;
    if (!取根目录中的) {
        取根目录中的 = invoke('私有空间根目录')
            .then((路径) => {
                私有根目录缓存 = 路径;
                return 路径;
            })
            .finally(() => {
                取根目录中的 = null;
            });
    }
    return 取根目录中的;
}

// 统一用斜杠拼接 安卓是 Linux 天然如此
//
// 别再改回反斜杠 安卓上反斜杠不是路径分隔符 会被当成一个普通文件名
// 旧实现就是这么写的 表现是读取永远落进 catch 返默认值 写入永远失败 还看不出错在哪
function 拼接私有路径(根目录, 子目录名, 文件名) {
    return [根目录, 子目录名, 文件名].filter(Boolean).join('/');
}

// 文件名统一按逻辑名传 如 应用设置 由这里补 .json
// 已经带扩展名的原样使用 方便往私有空间放非 JSON 的资源 头像 3.jpg 等
// 判据是有没有扩展名 不是结尾是不是 .json
// 早先写成 endsWith .json 结果 3.jpg 会被补成 3.jpg.json 能用但名不副实
function 补全文件名(文件名) {
    if (!文件名) return '';
    return 文件名.includes('.') ? 文件名 : 文件名 + '.json';
}

// 私有空间内某个文件的完整路径 一般用不到 读取和写入就够了
export async function 取文件路径(子目录名, 文件名) {
    return 拼接私有路径(await 取私有根目录(), 子目录名, 补全文件名(文件名));
}

// 某个子目录的完整路径 给 用系统程序打开该目录 这类场景留的口子
export async function 取子目录路径(子目录名) {
    return 拼接私有路径(await 取私有根目录(), 子目录名, '');
}

export async function 检查文件是否存在(子目录名, 文件名) {
    try {
        return !!(await invoke('检查文件是否存在', {
            路径: await 取文件路径(子目录名, 文件名),
        }));
    } catch {
        return false;
    }
}

// 读 JSON 文件不存在 内容损坏 路径不可达 一律返默认值 不抛异常
// 私有空间读失败基本都是首次运行 不该逼调用方到处写 try
export async function 读取文件(子目录名, 文件名, 默认值 = null) {
    try {
        const 内容 = await invoke('读取文件', {
            路径: await 取文件路径(子目录名, 文件名),
        });
        const 数据 = JSON.parse(内容);
        return 数据 ?? 默认值;
    } catch {
        return 默认值;
    }
}

// 写 JSON 父目录含 数据 设置 本身 由 Rust 侧 写入文件 自动创建 这里不必先建目录
// 缩进 2 空格 这些文件都很小 可读性比体积重要 出问题时能直接打开看
export async function 写入文件(子目录名, 文件名, 数据) {
    const 路径 = await 取文件路径(子目录名, 文件名);
    await invoke('写入文件', { 路径, 内容: JSON.stringify(数据, null, 2) });
    return 数据;
}

// 纯文本读写 给日志 缓存索引这类不想套 JSON 的内容留的
export async function 读取文本(子目录名, 文件名, 默认值 = '') {
    try {
        return await invoke('读取文件', {
            路径: await 取文件路径(子目录名, 文件名),
        });
    } catch {
        return 默认值;
    }
}

export async function 写入文本(子目录名, 文件名, 内容) {
    const 路径 = await 取文件路径(子目录名, 文件名);
    await invoke('写入文件', { 路径, 内容 });
    return 内容;
}

// 删一个文件 不存在也算成功 Rust 侧就是这么实现的
// 删掉不存在的东西本身就是目标状态 不该逼调用方到处写 try
// 返 false 只在真出错时 权限 路径非法
export async function 删除文件(子目录名, 文件名) {
    try {
        await invoke('删除文件', { 路径: await 取文件路径(子目录名, 文件名) });
        return true;
    } catch {
        return false;
    }
}

// 列出某个子目录下的文件名 不含子目录 目录不存在或读失败返空数组
//
// 和读取文件同一套态度 失败即空 不抛 首次运行时目录还没建出来是常态
export async function 列出文件(子目录名) {
    try {
        const 文本 = await invoke('列出目录', { 路径: await 取子目录路径(子目录名) });
        return 文本 ? 文本.split('\n').filter(Boolean) : [];
    } catch {
        return [];
    }
}

// ─────────────── 图片 走原生桥 不走 Rust
//
// 为什么单独一条通道 上面那套走 Rust 的只能传 UTF-8 文本
// PNG 直接当文本写会损坏 多字节序列被重新编码
// 这里 base64 中转 按字节落盘 原生用 android.util.Base64
//
// 两个都只认私有空间内的相对路径
// 读取图片 返 base64 而不是可直接用的 URL
// WebView 读不到私有目录的 file 只能把字节送回前端 自己拼 data / 转 blob URL

// 写一张图片 返 成功 和 状态
export function 写入图片(相对路径, base64数据) {
    if (typeof window.安卓目录?.写图片 !== "function") {
        return { 成功: false, 状态: "失败:当前平台不支持" };
    }
    try {
        const 状态 = window.安卓目录.写图片(相对路径, base64数据) || "失败:无返回";
        return { 成功: !String(状态).startsWith("失败"), 状态 };
    } catch (错误) {
        return { 成功: false, 状态: `失败:${错误?.message ?? "未知"}` };
    }
}

// 读一张图片 到 base64 不带 data 前缀 不存在或失败返空串
export function 读取图片(相对路径) {
    if (typeof window.安卓目录?.读图片 !== "function") return "";
    try {
        return window.安卓目录.读图片(相对路径) || "";
    } catch {
        return "";
    }
}
