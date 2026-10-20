// 编码处理 协议 §4.1 的 喵.工具.编码处理 文本和字节互转
//
// 关键事实 真机实测 new TextEncoder('gbk') 不报错但静默输出 UTF-8 字节
// 用它产出的查询串语法正确语义全错 搜索永远搜不到东西且毫无提示
// 所以 GBK 和 Big5 的编码必须自己查表
//
// 而解码方向是原生支持的 new TextDecoder('gbk') 能用
// 于是编码表可以反过来建 遍历所有双字节组合逐个 decode 建 字符 到 字节 的反查表
// 一次约 4.8 万次 decode 懒加载加缓存后就不再花时间

// 编码名 到 字符 到 字节数组 的反查表 建一次就缓存住
const 字符反查表缓存 = new Map();

// 建或取缓存里的 字符 到 字节 反查表
// 做法 把 GBK 和 Big5 所有合法的双字节组合逐个解码成字符 反着记下来
// 因为 TextDecoder 能解不能编 能编的那个 TextEncoder 只认 UTF-8
function 取字符反查表(编码名) {
    if (字符反查表缓存.has(编码名)) return 字符反查表缓存.get(编码名);
    const 表 = new Map();
    // ASCII 段直接照抄 0x00 到 0x7F 在所有目标编码里都和 ASCII 一致
    for (let 码 = 0x20; 码 <= 0x7e; 码++) 表.set(String.fromCharCode(码), [码]);
    let 解码器;
    try {
        解码器 = new TextDecoder(编码名);
    } catch {
        字符反查表缓存.set(编码名, 表);
        return 表;
    }
    for (let 高 = 0x81; 高 <= 0xfe; 高++) {
        for (let 低 = 0x40; 低 <= 0xfe; 低++) {
            if (低 === 0x7f) continue; // GBK 的双字节第二段跳过 0x7F
            let 字符;
            try {
                字符 = 解码器.decode(new Uint8Array([高, 低]));
            } catch {
                continue;
            }
            // 非法组合会被换成 U+FFFD 或解出多个字符 跳过即可
            if (!字符 || 字符.length !== 1 || 字符 === '\uFFFD') continue;
            if (!表.has(字符)) 表.set(字符, [高, 低]);
        }
    }
    字符反查表缓存.set(编码名, 表);
    return 表;
}

// 归一编码名 协议 §4.1
// 未知编码名直接抛错 绝不静默回退 回退成 utf-8 会让整页变乱码而不报错
export function 归一编码名(编码名) {
    const 原名 = String(编码名 ?? '').trim().toLowerCase();
    if (原名 === 'utf8' || 原名 === 'utf-8' || 原名 === '') return 'utf-8';
    if (原名 === 'ansi' || 原名 === 'gbk' || 原名 === 'gb2312' || 原名 === 'gb18030') return 'gbk';
    if (原名 === 'big5' || 原名 === '繁体' || 原名 === 'big-5') return 'big5';
    throw new Error(`E-ENC-001：不认识的编码名「${编码名}」（只支持 utf8 / ansi→gbk / big5）`);
}

// 喵.工具.编码处理 协议 §4.1 纯函数无状态 全局一份即可
export const 编码处理 = {
    async 文本编码(文本, 编码名) {
        const 名 = 归一编码名(编码名);
        const 文本串 = String(文本 ?? '');
        if (名 === 'utf-8') return new TextEncoder().encode(文本串);
        const 表 = 取字符反查表(名);
        const 字节 = [];
        for (const 字符 of 文本串) {
            const 命中 = 表.get(字符);
            if (命中) 字节.push(...命中);
            else 字节.push(0x3f); // 问号 该字符在目标编码里没有对应 别整段失败
        }
        return new Uint8Array(字节);
    },
    async 文本解码(字节, 编码名) {
        const 名 = 归一编码名(编码名);
        const 视图 = 字节 instanceof Uint8Array ? 字节 : new Uint8Array(字节 ?? []);
        return new TextDecoder(名).decode(视图);
    },
};
