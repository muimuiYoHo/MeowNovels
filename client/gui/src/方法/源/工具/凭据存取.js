// 凭据存取 协议 §4.1 的 喵.工具.Cookie 的存储与合并那一半
// 本源自己的 cookie 跨源读不到 协议 §4.1 恒绑本源标识加域名集
//
// 一共两份存储 必须双向同步 否则出三种很难查的错
//
//   不同步 WebView 的同源 fetch 带的是 CookieManager 那份 不是 App 凭据文件那份
//     登录 POST 走 WebView 成功后站点种在 CookieManager 里 而 App 读凭据文件
//     明明登录成功了 已登录 却判 false 搜索一直被拦
//   只清 App 凭据 CookieManager 里旧登录态还在
//     (a) 用户点了清空 cookie 搜索却照样能跑 清了个寂寞
//     (b) 重新登录时 WebView 带着旧登录态去 POST 站点当已登录忽略新密码
//         报 登录失败请检查用户名和密码 这就是清空后登不进去的真凶
//   整串乱并 隐藏 WebView 访问站点时会顺带种一个匿名会话 cookie 如 PHPSESSID
//     整段并进来会把源的登录态覆盖成匿名 现象是过完挑战反而被登出了
//     所以 WebView 拿回来的整串只在非 GET 请求 登录那种 之后并 GET 只并 cf
import { 私有目录, 读取文件, 写入文件 } from '../../存储';
import { 同步Cookie进WebView } from '../../网络';

const 凭据目录 = `${私有目录.数据}/源/凭据`;

// 挑战 cookie 的判据 cf_clearance __cf_bm cf_chl 这一族 前导下划线可有可无
const 是挑战Cookie = /^_*cf/i;

// 造一个本源凭据存取器
// 选项 标识 和 日志 日志是宿主侧数组 凭据同步失败要留痕
export function 造凭据存取器({ 标识 = '', 日志 = [] } = {}) {
    // 表项形如 名 和 值 懒加载 第一次用到才读盘
    let 凭据表 = null;

    // 读本源凭据表 懒加载 读一次就留在内存里
    async function 读取凭据表() {
        if (凭据表) return 凭据表;
        const 盘上 = await 读取文件(凭据目录, 标识, null);
        凭据表 = Array.isArray(盘上?.Cookie) ? 盘上.Cookie : [];
        return 凭据表;
    }

    // 把内存里的凭据表整体写回磁盘
    async function 保存凭据表() {
        await 写入文件(凭据目录, 标识, { Cookie: 凭据表 ?? [], 更新时间: new Date().toISOString() });
    }

    // 并入一枚凭据 同名覆盖 新名追加 返是否真的变了
    // 抽出来是因为三条路都要用 响应头 WebView 整串 撞挑战后的重试
    function 并入一枚凭据(名, 值) {
        if (!名) return false;
        const 表 = 凭据表 ?? [];
        const 已有 = 表.find((条) => 条.名 === 名);
        if (已有) {
            if (已有.值 === 值) return false;
            已有.值 = 值;
            return true;
        }
        表.push({ 名, 值 });
        凭据表 = 表;
        return true;
    }

    // 把一串 名等于值 分号分隔 逐个并进来 返是否变了
    function 并入一串凭据(整串) {
        let 变过 = false;
        for (const 段 of String(整串 || '').split(';')) {
            const 单项 = 段.trim();
            const 等号位置 = 单项.indexOf('=');
            if (等号位置 <= 0) continue;
            const 名 = 单项.slice(0, 等号位置).trim();
            const 值 = 单项.slice(等号位置 + 1).trim();
            if (并入一枚凭据(名, 值)) 变过 = true;
        }
        return 变过;
    }

    // 并入响应头里的 Set-Cookie 按名逐个覆盖 不整段替掉 协议明说
    // 原生层把同名头用换行连起来了 每条 cookie 独占一行
    // 不这样拆 一次响应种 3 条 cookie 会只认到第 1 条
    function 并入响应种下的凭据(响应头) {
        const 原始头 = 响应头?.['set-cookie'];
        if (!原始头) return false;
        let 变过 = false;
        for (const 一条 of String(原始头).split('\n').filter(Boolean)) {
            const 主体 = 一条.split(';')[0];
            const 等号位置 = 主体.indexOf('=');
            if (等号位置 <= 0) continue;
            const 名 = 主体.slice(0, 等号位置).trim();
            const 值 = 主体.slice(等号位置 + 1).trim();
            if (并入一枚凭据(名, 值)) 变过 = true;
        }
        return 变过;
    }

    // 把 CookieManager 里的整串并进本源凭据
    //
    // 只在非 GET 的请求走 WebView 之后调 登录就是这种
    // 那条路上 WebView 自己发的请求 站点种下的新 cookie jieqiVisitInfo 等登录态
    // 只落在 CookieManager 里 不并回来就会出现上面 ① 那种登录成功却判未登录
    // 与 GET 那条路故意相反 GET 只并 cf 见 并入挑战凭据
    async function 并入WebView整串凭据(整串) {
        const 变过 = 并入一串凭据(整串);
        if (变过) await 保存凭据表();
        return 变过;
    }

    // 只并 CF 自己那族 cookie cf 和 __cf
    // 撞挑战之后用 那一刻 CookieManager 里还混着匿名会话 cookie 整串并会覆盖登录态
    async function 并入挑战凭据(整串) {
        let 变过 = false;
        for (const 段 of String(整串 || '').split(';')) {
            const 单项 = 段.trim();
            const 等号位置 = 单项.indexOf('=');
            if (等号位置 <= 0) continue;
            const 名 = 单项.slice(0, 等号位置).trim();
            if (!是挑战Cookie.test(名)) continue;
            if (并入一枚凭据(名, 单项.slice(等号位置 + 1).trim())) 变过 = true;
        }
        if (变过) await 保存凭据表();
        return 变过;
    }

    // 拼成 名等于值 分号分隔 塞请求头和推给 WebView 都用它
    async function 拼成Cookie串({ 只要挑战Cookie = false } = {}) {
        const 表 = await 读取凭据表();
        return 表
            .filter((条) => (只要挑战Cookie ? 是挑战Cookie.test(条.名) : true))
            .map((条) => `${条.名}=${条.值}`)
            .join('; ');
    }

    // 把本源凭据推进系统 CookieManager WebView 请求前必须做 否则带的是旧值
    // 非安卓或旧包没有这座桥就返 false 调用方照常继续
    async function 推送凭据进WebView(地址) {
        if (typeof 同步Cookie进WebView !== 'function') return false;
        const 串 = await 拼成Cookie串();
        if (!串) return false;
        const 结果 = await 同步Cookie进WebView(地址, 串);
        if (!结果?.成功) 日志.push(`⚠️ 凭据同步进 WebView 失败：${结果?.错误 ?? '未知'}`);
        return !!结果?.成功;
    }

    // 喵.工具.Cookie 协议 §4.1 方法名是契约 别改
    const Cookie工具 = {
        async 获取Cookie() {
            return (await 读取凭据表()).map((条) => ({ ...条 }));
        },
        async 设置Cookie(名, 值) {
            const 表 = await 读取凭据表();
            const 已有 = 表.find((条) => 条.名 === 名);
            if (已有) 已有.值 = 值;
            else 表.push({ 名, 值 });
            await 保存凭据表();
        },
        // 只清本源凭据文件 CookieManager 那边由 清空 cookie 页走桥双清 否则见文件头的 ②
        async 清理Cookie() {
            凭据表 = [];
            await 保存凭据表();
        },
    };

    return {
        Cookie工具,
        读取凭据表,
        保存凭据表,
        并入一枚凭据,
        并入响应种下的凭据,
        并入WebView整串凭据,
        并入挑战凭据,
        拼成Cookie串,
        推送凭据进WebView,
    };
}
