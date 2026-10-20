import { 私有目录, 读取文件, 写入文件 } from './存储';

// 应用设置统一落在 设置/应用设置.json 一个文件装全部分组 分组只是文件里的一个键
//
// 早先是一个分组一个文件 那个实现有两个致命问题
//   安卓上反斜杠不是路径分隔符 且根目录是只读的 native lib 目录
//     读取永远返默认值 写入永远失败
//   一个分组一个文件 加分组就得加文件 还容易出现只更新了一半
//
// 这里 import 的是 ./存储 不是早先写的 ./私有存储 那个文件根本不存在
// 它按平台后缀解析成 存储.android.js 和 存储.win.js .share.js 才能两边通用
// 一直没暴露是因为只有 PC 端那两个设置页引用本模块 安卓构建里这条链没进 bundle

const 设置文件 = '应用设置';

// 各分组的预设内容 只用于首次运行 文件一旦存在就以盘上的为准
// 往这里加新项不会自动补进已有文件 已有用户的设置项新增要另写迁移
// 结构必须与 资源/初始数据/设置/应用设置.json 保持一致
// 两边不一致就会出现 首次运行一套结构 之后一套结构 的鬼故事
const 默认设置 = {
    常规: {
        语言: '中文',
    },
    下载: {
        资源目录: {
            下载: '', // 空串表示没自定义 用默认 本喵开放空间/files/数据/下载
            导出: '',
        },
    },
};

function 克隆(值) {
    return JSON.parse(JSON.stringify(值));
}

// 整份设置的缓存 设置文件很小 但点一次开关就走一趟 IPC 加解析没必要
// 缓存一份 写的时候同步更新缓存再落盘
// 对外返回的都是克隆 避免调用方直接改到缓存
let 缓存 = null;
let 在取 = null;

async function 取全部() {
    if (缓存) return 缓存;
    if (!在取) {
        在取 = (async () => {
            const 盘上 = await 读取文件(私有目录.设置, 设置文件, null);
            if (盘上 && typeof 盘上 === 'object' && !Array.isArray(盘上)) {
                缓存 = 盘上;
            } else {
                // 首次运行或文件损坏 把默认值落盘
                // 让 设置文件存在 变成后续唯一的判断依据
                缓存 = 克隆(默认设置);
                await 写入文件(私有目录.设置, 设置文件, 缓存);
            }
            return 缓存;
        })().finally(() => {
            在取 = null;
        });
    }
    return 在取;
}

// 沿路径走一层 路径用点分隔 如 下载.资源目录.下载
// 中间层不存在或不是对象 返 null 调用方自己决定兜底什么
function 走到(全部, 路径) {
    let 当前 = 全部;
    for (const 段 of String(路径).split('.')) {
        if (当前 === null || typeof 当前 !== 'object' || !(段 in 当前)) return null;
        当前 = 当前[段];
    }
    return 当前;
}

// 沿路径走一层 中间层不存在就建出来 返末段的父对象和末段名
function 走到并建好(全部, 路径) {
    const 段们 = String(路径).split('.');
    const 末段 = 段们.pop();
    let 当前 = 全部;
    for (const 段 of 段们) {
        if (当前[段] === null || typeof 当前[段] !== 'object' || Array.isArray(当前[段])) 当前[段] = {};
        当前 = 当前[段];
    }
    return [当前, 末段];
}

// ─────────────── 路径式读写 安卓侧用这套
//
// 为什么用路径而不是 取值('下载').资源目录.下载
// 调用方经常只想要最深那一个值 层层解引用既啰嗦又要到处判空
// 路径式把 不存在 统一成 返回默认值

// 按路径取值 任何一层不存在都返默认值 不抛
export async function 取值(路径, 默认值 = null) {
    const 值 = 走到(await 取全部(), 路径);
    return 值 === null ? 克隆(默认值) : 克隆(值);
}

// 按路径写值 中间层不存在就建
export async function 设值(路径, 值) {
    const 全部 = await 取全部();
    const [父, 末段] = 走到并建好(全部, 路径);
    父[末段] = 值;
    await 写入文件(私有目录.设置, 设置文件, 全部);
}

// 一次改多条 避免连点时写好几遍 参数形如 下载.资源目录.下载 到 描述符
export async function 设一批(路径值对) {
    const 全部 = await 取全部();
    for (const [路径, 值] of Object.entries(路径值对)) {
        const [父, 末段] = 走到并建好(全部, 路径);
        父[末段] = 值;
    }
    await 写入文件(私有目录.设置, 设置文件, 全部);
}

// 整份设置 克隆
export async function 读取全部() {
    return 克隆(await 取全部());
}

// 丢掉内存缓存 下次读重新从盘上取 文件被外部改过时用
export function 设置缓存失效() {
    缓存 = null;
}

// ─────────────── 旧签名 PC 端的开关列表用
//
// 基本设置.win.vue 和 外观设置.win.vue 还在调这三个
// 但新结构里 基础设置 和 外观设置 这两个分组已经不存在 现在分组是对象不是开关数组
// 实际会拿到空列表 PC 端本来就是坏账 不为此重构
// 保留签名只是为了让那两个页不崩 并在控制台留一句线索
// 将来重做 PC 端设置页时 这两个分组该按 默认设置 的新形态重写

export async function 读取设置(分组) {
    const 值 = await 取值(分组, []);
    return Array.isArray(值) ? 值 : [];
}

export async function 更新设置(分组, id, 新值) {
    const 列表 = await 读取设置(分组);
    if (!列表.length) {
        console.warn(`设置分组「${分组}」不是开关列表（新结构下已废弃），本次写入被忽略`);
        return [];
    }
    const 项 = 列表.find((i) => i.id === id);
    if (项) 项.值 = 新值;
    await 设值(分组, 列表);
    return 克隆(列表);
}

export async function 批量更新设置(分组, 更新列表) {
    const 列表 = await 读取设置(分组);
    if (!列表.length) {
        console.warn(`设置分组「${分组}」不是开关列表（新结构下已废弃），本次写入被忽略`);
        return [];
    }
    for (const { id, 值 } of 更新列表) {
        const 项 = 列表.find((i) => i.id === id);
        if (项) 项.值 = 值;
    }
    await 设值(分组, 列表);
    return 克隆(列表);
}
