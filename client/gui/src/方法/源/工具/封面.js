// 取回封面 协议 §4.1 和 §5.1 源只报地址 下载和转码是宿主的事
//
// 这条路不走 发起网络请求 那条会处理 CF 挑战 cookie 流量
// 而是直接打原生层 封面是静态图床 实测没有 CF 指纹拦截
// 所以省掉挑战那套判断更省事 也省一次 1.5 秒的等待
import { 发起请求 } from '../../网络';

// 图片后缀 返统一用 jpg 兜底 content-type 认不出时
const 认后缀 = (内容类型) => {
    const 类型 = String(内容类型 || '').toLowerCase();
    if (类型.includes('png')) return 'png';
    if (类型.includes('webp')) return 'webp';
    if (类型.includes('gif')) return 'gif';
    return 'jpg';
};

// 把字节数组转成 base64 分块做 避免 apply 参数过多爆栈
function 字节转base64(字节) {
    let 二进制串 = '';
    for (let 起点 = 0; 起点 < 字节.length; 起点 += 0x8000) {
        二进制串 += String.fromCharCode.apply(null, 字节.subarray(起点, 起点 + 0x8000));
    }
    return btoa(二进制串);
}

// 造一个 喵.工具.取回封面
// 依赖 校验域名白名单 失败时字段全空
export function 造封面取回器({ 校验域名白名单 } = {}) {
    return async function 取回封面(选项 = {}) {
        if (!选项.地址) return { 地址: '', 纯base64: '', 后缀: '', 字节数: 0 };
        // 白名单要真的拦 协议 §10 这里以前把这句的返回值丢掉了
        // 等于源可以借取封面的名义去请求任意地址 内网 别的站 那正是 §10 要挡住的事
        // 现在与 发起网络请求 同一口径 越界直接抛
        const 越界 = 校验域名白名单(选项.地址, '取封面');
        if (越界) throw new Error(越界);

        const 原生结果 = await 发起请求({ 地址: 选项.地址, 头: 选项.请求头 || {}, 超时毫秒: 20000 });
        if (!原生结果.成功) return { 地址: '', 纯base64: '', 后缀: '', 字节数: 0 };

        const 后缀 = 认后缀(原生结果.头?.['content-type']);
        const 字节 = 原生结果.原始;
        const 纯base64 = 字节转base64(字节);
        return {
            地址: `data:image/${后缀 === 'jpg' ? 'jpeg' : 后缀};base64,${纯base64}`,
            纯base64,
            后缀,
            字节数: 字节.length,
        };
    };
}
