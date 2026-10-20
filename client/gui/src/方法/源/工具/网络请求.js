// 发起网络请求 源唯一的网络出口
//
// 两条路
//   普通请求 走 Rust 或 Kotlin 原生 reqwest 或 HttpURLConnection 快 但没有 JS 引擎
//   借隐藏 WebView 取页 唯一能过 CF JS 挑战的路 WebView 引擎和真机浏览器同一套网络栈
//     过挑战 这个动作本身在 方法/网络.*.js 这里只负责什么时候要用它
//     以及把取回的结果按源协议还原成统一响应
//
// 返回形状统一 状态 头 键小写 原始 Uint8Array 文本 地址
// 文本没有隐式 utf-8 默认 协议 §4.1 不给编码就留 null 逼源显式表态
import { 发起请求, 过挑战, 解码base64 } from '../../网络';
import { 编码处理 } from './编码处理';

// 这个响应是不是 CF 的挑战 不是站点自己的 403
//
// 判据两个都满足才算 ① 响应头是 CF 的 server cf-ray cf-mitigated ② 状态 403 429 503
//
// 只看 状态等于 403 就过挑战 会把站点自己的禁止访问误判成挑战
// 白等 25 秒 而且现象上完全看不出为什么慢
export function 是不是人机挑战(结果) {
    const 头 = 结果?.头 || {};
    const 是CF =
        String(头['server'] || '').toLowerCase().includes('cloudflare') ||
        !!头['cf-ray'] ||
        !!头['cf-mitigated'];
    if (!是CF) return false;
    return 结果.状态 === 403 || 结果.状态 === 429 || 结果.状态 === 503;
}

// 造一个网络请求器
//
// 依赖 元信息 取 每次过挑战
//      域名集 白名单 协议 §10
//      凭据存取 造凭据存取器 的返回值 读写合并 cookie 推进 WebView
//      累加下载字节 流量统计
export function 造网络请求器({ 元信息 = {}, 域名集 = [], 凭据存取, 累加下载字节 = (响应) => 响应 } = {}) {
    // host 白名单校验 协议 §10 域名集为空不校验 宽松 方便第一次接源
    // 越界返错误文案 正常返 null
    function 校验域名白名单(地址, 场景) {
        if (!域名集.length) return null;
        let 主机名;
        try {
            主机名 = new URL(地址, 'https://placeholder.invalid').hostname;
        } catch {
            return null;
        }
        const 通过 = 域名集.some((允许) => 主机名 === 允许 || 主机名.endsWith('.' + 允许));
        return 通过 ? null : `E-NET-201：${场景}「${主机名}」不在本源的域名集里（${域名集.join(' / ')}）`;
    }

    // 发一次网络请求 协议 §4.1
    //
    // 选项 认得这些键 方法 数据 对象等于表单 头 编码 不给则文本为 null
    //   不跟随重定向 超时 信号 源自己不需要读它 是给工具内部用的
    async function 发起网络请求(地址, 选项 = {}) {
        const 开始时刻 = Date.now();
        // 只在慢请求时提示 正常一次 0.5 到 0.6 秒 别刷屏 排查性能问题时很有用
        const 记一次耗时 = (环节) => {
            const 耗时 = Date.now() - 开始时刻;
            if (耗时 > 1000) console.warn(`[慢请求] ${环节} ${耗时}ms ${String(地址).slice(0, 70)}`);
        };
        const 越界 = 校验域名白名单(地址, '请求');
        if (越界) throw new Error(越界);

        // 组 WebView 请求体 数据是对象表单时按 urlencoded 编码
        const 拼请求体 = () => {
            const 是GET = !选项.数据 && (!选项.方法 || String(选项.方法).toUpperCase() === 'GET');
            if (是GET) return '';
            return typeof 选项.数据 === 'string'
                ? 选项.数据
                : Object.entries(选项.数据 || {})
                      .map(([键, 值]) => `${encodeURIComponent(键)}=${encodeURIComponent(String(值 ?? ''))}`)
                      .join('&');
        };

        // 借隐藏 WebView 把这一页取回来 GET POST 都行 返原生给的结果对象
        async function 借隐藏WebView取回页面() {
            const 方法 = String(选项.方法 || 'GET').toUpperCase();
            const 取回结果 = await 过挑战(地址, { 方法, 体: 拼请求体(), 头: 选项.头 });
            记一次耗时(`过挑战返回(${取回结果?.成功 ? '成功' : '失败'})`);
            return 取回结果;
        }

        // 把 WebView 取回的结果按源协议还原成响应对象
        // 返 null 表示没取到内容 调用方决定退回什么
        //
        // WebView 里的 fetch 一定会跟随重定向 而源要靠 不跟随 加 看 location
        // 区分精确匹配直跳详情 与 未登录跳 login.php
        // 所以最终地址变了就还原成 3xx 交回给源判断
        // 只比路径加查询串 http 到 https 补斜杠这类无害重定向不该触发
        async function 把取回结果还原成响应(取回结果) {
            if (!取回结果?.成功) return null;
            const 方法 = String(选项.方法 || 'GET').toUpperCase();
            const 是GET = 方法 === 'GET' || 方法 === 'HEAD';
            const 取路径与查询 = (网址) => {
                try {
                    const 解析 = new URL(网址);
                    return 解析.pathname + 解析.search;
                } catch {
                    return 网址;
                }
            };
            if (是GET && 取回结果.地址 && 取路径与查询(取回结果.地址) !== 取路径与查询(地址)) {
                return { 状态: 302, 地址: 取回结果.地址, 头: { location: 取回结果.地址 }, 原始: new Uint8Array(0), 文本: null };
            }
            // 优先用 b64 原始字节 同源 fetch 拿得到 arrayBuffer 字节就是站点原本的 charset 可能是 GBK
            // 用字符串的话 Response.text 会一律按 UTF-8 解 整篇乱码
            if (取回结果.b64) {
                const 原始字节 = 解码base64(取回结果.b64);
                const 响应 = {
                    状态: Number(取回结果.状态) || 200,
                    地址: 取回结果.地址 || 地址,
                    头: {},
                    原始: 原始字节,
                    文本: null,
                };
                if (选项.编码) 响应.文本 = await 编码处理.文本解码(原始字节, 选项.编码);
                await 凭据存取.并入WebView整串凭据(取回结果.Cookie);
                return 响应;
            }
            if (取回结果.页面) {
                await 凭据存取.并入WebView整串凭据(取回结果.Cookie);
                return {
                    状态: Number(取回结果.状态) || 200,
                    地址: 取回结果.地址 || 地址,
                    头: {},
                    原始: new TextEncoder().encode(取回结果.页面),
                    文本: 取回结果.页面,
                };
            }
            return null;
        }

        // ── 请求头里的 Cookie 三态
        const 凭据表 = await 凭据存取.读取凭据表();
        const 请求头 = { ...(选项.头 || {}) };
        const 显式Cookie键 = Object.keys(请求头).find((键) => 键.toLowerCase() === 'cookie');
        if (显式Cookie键 === undefined) {
            // 默认 带上本源全部凭据 Rust 侧 cookie jar 是内存的 App 重启就空
            // 不带这一下 登录过但重开 App 会变成 搜索需要登录
            const 全串 = await 凭据存取.拼成Cookie串();
            if (全串) 请求头.Cookie = 全串;
        } else {
            // 调用方显式表态了 协议 Cookie 空串 等于别替我加凭据 匿名请求用
            // 但挑战 cookie 不是凭据 它是过 CF 的通行证 必须带上
            // 不然文库8 那种匿名翻页会每次重新撞挑战 永远过不去
            const 挑战串 = await 凭据存取.拼成Cookie串({ 只要挑战Cookie: true });
            if (挑战串) {
                请求头[显式Cookie键] = [String(请求头[显式Cookie键] || ''), 挑战串].filter(Boolean).join('; ');
            }
        }

        // 源声明 每次过挑战 就直接走 WebView 跳过那次注定失败的普通请求
        // 实测文库8 普通 HTTP 无论带不带 cf_clearance 都被 CF 403
        // 既然注定要过挑战 就别白打那一次 实测白费 1.3 秒 占搜索慢的一大半
        // 取到就直接返回 取不到再退回落普通流程 CF 偶尔放过还能救回来
        if (!选项.已过挑战 && 元信息.每次过挑战) {
            const 直达 = await 把取回结果还原成响应(await 借隐藏WebView取回页面());
            if (直达) return 累加下载字节(直达);
        }

        const 原生结果 = await 发起请求({
            地址,
            方法: 选项.方法 || 'GET',
            数据: 选项.数据,
            头: 请求头,
            不跟随重定向: !!选项.不跟随重定向,
            超时毫秒: 选项.超时 ?? 30000,
        });
        记一次耗时('发起请求返回(状态' + (原生结果.成功 ? 原生结果.状态 : '失败') + ')');
        if (!原生结果.成功) throw new Error(`E-NET-203：请求失败 —— ${原生结果.错误}`);

        // 重定向的落点也要校验 协议 §10 明说
        if (原生结果.最终地址) {
            const 跳转越界 = 校验域名白名单(原生结果.最终地址, '重定向目标');
            if (跳转越界) throw new Error(跳转越界);
        }

        if (凭据存取.并入响应种下的凭据(原生结果.头)) await 凭据存取.保存凭据表();

        // 请求前把凭据同步进系统 CookieManager
        // 只有 非 GET 且将被 WebView 代发 撞挑战 时才需要 但提前同步最省心
        // WebView 的同源 fetch 用 credentials include 带的是 CookieManager 那份
        // 它跟 App 凭据文件是两份独立存储 不同步就会带旧登录态去请求
        // 代价只有一次 setCookie 内存操作 可忽略
        if (凭据表.length) await 凭据存取.推送凭据进WebView(地址);

        // 撞上 CF 挑战 借隐藏 WebView 过一次 把 cf_clearance 并进凭据 重试一次
        // 普通 HTTP 过不了 CF 的 JS 挑战 reqwest 和 HttpURLConnection 都不跑 JS
        // 已过挑战 防死循环 过了还失败就是真失败 不该无限转
        if (!选项.已过挑战 && 是不是人机挑战(原生结果)) {
            记一次耗时('撞挑战，走 WebView');
            const 取回结果 = await 借隐藏WebView取回页面();
            const 借回 = await 把取回结果还原成响应(取回结果);
            if (借回) return 累加下载字节(借回);
            // 拿不到页面 POST 或空页 退回把挑战 cookie 并进凭据 重试一次
            if (取回结果?.Cookie) {
                await 凭据存取.并入挑战凭据(取回结果.Cookie);
                return 发起网络请求(地址, { ...选项, 已过挑战: true });
            }
        }

        const 响应 = {
            状态: 原生结果.状态,
            地址: 原生结果.最终地址 || 地址,
            头: 原生结果.头,
            原始: 原生结果.原始,
            文本: null,
        };
        // 没有隐式 utf-8 默认 协议 §4.1 不给编码就留 null 逼源显式表态
        // 否则每个要用 GBK 的源都得绕过框架自己解一遍
        if (选项.编码) 响应.文本 = await 编码处理.文本解码(原生结果.原始, 选项.编码);
        return 累加下载字节(响应);
    }

    return { 发起网络请求, 校验域名白名单 };
}
