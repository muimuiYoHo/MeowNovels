import { 私有目录, 读取文件, 写入文件 } from './私有存储';

// 应用设置统一落在 `设置/应用设置.json` —— 一个文件装全部分组。
//
// 早先是「一个分组一个文件」（基础设置.json / 外观设置.json），路径写成
// `应用数据\设置\xxx.json`。那个实现有两个致命问题：
//   1. 安卓上 '\\' 不是路径分隔符，且根目录是只读的 native lib 目录
//      → 读取永远返回默认值、写入永远失败（详见 私有存储 与 platform.android.rs）
//   2. 一个分组一个文件，加分组就得加文件，还容易出现「只更新了一半」
// 现在收进私有存储 + 单文件，分组只是文件里的一个键。

const 设置文件 = '应用设置';

// 各分组的预设内容。**只用于首次运行**：文件一旦存在就以盘上的为准。
// 注意往这里加新项不会自动补进已有文件 —— 已有用户的设置项新增要另写迁移。
const 默认设置 = {
    基础设置: [
        { id: '1', 内容: '承认本喵是最可爱的！', 值: true },
        { id: '2', 内容: '自动更新', 值: false },
    ],
    外观设置: [
        { id: '1', 内容: '毛玻璃效果', 值: true },
        { id: '2', 内容: '自动全屏', 值: false },
    ],
};

function 克隆(值) {
    return JSON.parse(JSON.stringify(值));
}

// 整份设置的缓存。设置文件很小，但「点一次开关就走一趟 IPC + 解析」没必要；
// 缓存一份，写的时候同步更新缓存再落盘。
// 对外返回的都是克隆，避免调用方直接改到缓存（页面把它当只读列表用）。
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
                // 首次运行（或文件损坏）：把默认值落盘，
                // 让「设置文件存在」变成后续唯一的判断依据。
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

// 读某个分组的开关列表。分组不存在时返回该分组的默认值，不抛异常 ——
// 组件 mounted 里直接 await 就用，不需要 try。
export async function 读取设置(分组) {
    const 全部 = await 取全部();
    const 列表 = 全部[分组];
    return 克隆(Array.isArray(列表) ? 列表 : 默认设置[分组] || []);
}

// 改单个开关，返回该分组的最新列表
export async function 更新设置(分组, id, 新值) {
    const 全部 = await 取全部();
    const 列表 = 全部[分组];
    if (!Array.isArray(列表)) {
        console.warn(`设置分组「${分组}」不存在于 ${设置文件}.json`);
        return [];
    }
    const 项 = 列表.find((i) => i.id === id);
    if (!项) {
        console.warn(`设置项「${id}」不存在于分组「${分组}」`);
        return 克隆(列表);
    }
    项.值 = 新值;
    await 写入文件(私有目录.设置, 设置文件, 全部);
    return 克隆(列表);
}

// 批量改：一次落盘，避免连点时写好几遍
export async function 批量更新设置(分组, 更新列表) {
    const 全部 = await 取全部();
    const 列表 = 全部[分组];
    if (!Array.isArray(列表)) return [];
    for (const { id, 值 } of 更新列表) {
        const 项 = 列表.find((i) => i.id === id);
        if (项) 项.值 = 值;
    }
    await 写入文件(私有目录.设置, 设置文件, 全部);
    return 克隆(列表);
}

// 丢掉内存缓存，下次读重新从盘上取（文件被外部改过时用）
export function 设置缓存失效() {
    缓存 = null;
}
