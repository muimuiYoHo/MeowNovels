<template>
    <div class="子页" @click="取消确认全部">
        <TitleBar 标题="Cookie" @返回="$emit('返回')" />
        <div class="内容区">
            <p class="说明">Cookie 由日轻喵来管理，本喵会按「源」隔离，不会对外展示内容但也不能让你手动改抱歉喵。喵只能告诉你「有没有」和「什么时候更新的」</p>

            <div class="源管理">
                <div v-for="项 in 列表" :key="项.标识">
                    <div class="平台信息">
                        <div class="源名">{{ 项.显示名称 }}</div>
                        <div class="cookie信息">{{ 项.信息文字 }}</div>
                    </div>
                    <span class="清空单个" :style='{ "--图标": `url("${图标表.删除}")` }' @click.stop="请求清空单个(项)"></span>
                </div>
                <p v-if="!列表.length" class="空态">还没有 cookie 喵~</p>
            </div>

            <div class="操作区">
                <div class="del" :class="{ 确认中: 待确认全部 }" @click.stop="处理清空全部">
                    <span :style='{ "--图标": `url("${待确认全部 ? 图标表.永远删除 : 图标表.清空Cookie}")` }'></span>
                    {{ 待确认全部 ? "确认清空？" : "清空全部 cookie" }}
                </div>
            </div>
        </div>

        <!-- 单个源清空不可逆 登录态会没 走确认弹窗 -->
        <Dialog :显示="!!待清空项" 类型="确认" 危险 :标题="待清空项 ? `清空「${待清空项.显示名称}」的 cookie？` : ''"
                :确认文字="待清空项 ? '清空' : ''"
                @取消="待清空项 = null" @确认="确认清空单个">
            <p class="弹窗说明">会退出该源的登录态（包括浏览器侧那一份），之后需要重新登录喵。</p>
        </Dialog>
    </div>
</template>

<script>
import 图标表 from '../../../资源/页面图标.ts';
import { 安卓吐司 } from '../../../方法/吐司';
import { 私有目录, 读取文件, 删除文件, 读取文本 } from '../../../方法/存储';
import { 提取元信息 } from '../../../方法/源/元信息';
import { 清WebViewCookie } from '../../../方法/网络';
import TitleBar from '../../UI/标题栏.android.vue';
import Dialog from '../../UI/弹窗.android.vue';

// 铁律 style 里的行注释绝不能出现连续两个减号
// PostCSS 看到连续减号会当注释开始符 整段 style 编译失败
// vite 的 style 子模块返 HTTP 500 但表现却是 Failed to fetch dynamically imported module
// 假象 排查了很久
// 判据 curl 那个 vue style 地址看是不是 500 报错正文里有 Unknown word
// 同源 themes.xml 的 XML 注释里也不能有连续两个减号 Gradle 会失败

// cookie 落在 数据/源/凭据/源标识.json 与书源一一对应 按源隔离
// 结构是 Cookie 数组加更新时间 由 方法/源/工具/凭据存取.js 的 保存凭据表 维护
const 凭据目录 = `${私有目录.数据}/源/凭据`;
const 源目录 = `${私有目录.数据}/源`;
const 注册文件名 = '源注册';

function 格式化时间(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export default {
    name: "Cookie",
    emits: ["返回"],
    components: { TitleBar, Dialog },
    data() {
        return {
            图标表,
            列表: [],
            待清空项: null,    // 正在等确认的单个源
            待确认全部: false,
            清空定时器: null,
        };
    },
    async mounted() {
        await this.刷新();
    },
    beforeUnmount() {
        clearTimeout(this.清空定时器);
    },
    methods: {
        async 刷新() {
            const 注册 = (await 读取文件(源目录, 注册文件名, null)) ?? [];
            const 列表 = [];
            for (const 项 of Array.isArray(注册) ? 注册 : []) {
                const 标识 = 项.标识 || '';
                if (!标识) continue;
                // 显示名 自定义名称 到 注册表名称 到 源文件元信息里的名称 到 标识
                let 名称 = 项.自定义名称 || 项.名称 || '';
                let 域名集 = [];
                if (!名称) {
                    const 文本 = await 读取文本(源目录, 项.文件);
                    const { 对象 } = 提取元信息(文本);
                    名称 = 名称 || 对象?.名称 || '';
                    域名集 = Array.isArray(对象?.域名集) ? 对象.域名集 : [];
                }
                // 域名集总得读源文件 注册表里不存它 清 CookieManager 要按域名清
                if (!域名集.length) {
                    const 文本 = await 读取文本(源目录, 项.文件);
                    const { 对象 } = 提取元信息(文本);
                    域名集 = Array.isArray(对象?.域名集) ? 对象.域名集 : [];
                }
                const 盘上 = await 读取文件(凭据目录, 标识, null);
                const 条数 = Array.isArray(盘上?.Cookie) ? 盘上.Cookie.length : 0;
                const 更新时间 = 盘上?.更新时间 || '';
                列表.push({
                    标识,
                    显示名称: 名称 || 标识,
                    域名集,
                    条数,
                    更新时间,
                    信息文字: 条数
                        ? `${条数} 个 cookie · 上次更新 ${格式化时间(更新时间)}`
                        : '没有 cookie',
                });
            }
            this.列表 = 列表;
        },

        // 清一个源的 cookie 凭据文件和系统 CookieManager 都要清
        //
        // 只删文件是不够的 WebView 的同源 fetch 带的是 CookieManager 那份
        //   (a) 不清它 用户点了清空搜索却照样能跑 清了个寂寞
        //   (b) 不清它 重新登录时 WebView 带着旧登录态去 POST
        //       站点当已登录直接忽略新密码 报登录失败请检查用户名和密码
        async 清本源(项) {
            await 删除文件(凭据目录, 项.标识);
            // 不 await 清 CookieManager 是顺手做干净 不是主流程
            // 逐个 await 会让清空全部串行等 5 个域名 每个可能 4 秒超时
            // 用户点完要干等 20 秒 fire-and-forget 就好 原生侧自己会清
            for (const 域名 of 项.域名集 || []) {
                清WebViewCookie(`https://${域名}/`);
            }
        },

        // ── 清空单个
        请求清空单个(项) {
            this.待清空项 = 项;
        },
        async 确认清空单个() {
            const 项 = this.待清空项;
            if (!项) return;
            this.待清空项 = null;
            await this.清本源(项);
            await this.刷新();
            安卓吐司(`已清空「${项.显示名称}」的 cookie`);
        },

        // ── 清空全部 两段确认 3 秒不点自动撤回
        处理清空全部() {
            if (!this.待确认全部) {
                if (!this.列表.length) {
                    安卓吐司('还没有 cookie 喵');
                    return;
                }
                this.待确认全部 = true;
                this.清空定时器 = setTimeout(() => { this.待确认全部 = false; }, 3000);
                return;
            }
            clearTimeout(this.清空定时器);
            this.真清空全部();
        },
        async 真清空全部() {
            this.待确认全部 = false;
            for (const 项 of this.列表) {
                await this.清本源(项);
            }
            await this.刷新();
            安卓吐司('已清空全部 cookie');
        },

        取消确认全部() {
            if (!this.待确认全部) return;
            clearTimeout(this.清空定时器);
            this.待确认全部 = false;
        },
    },
};
</script>

<style scoped>
.子页 {
    position: relative;
    height: 100%;
    width: 100%;
    display: flex;
    overflow: hidden;
    flex-direction: column;
    background-color: var(--页面背景);
    padding: 0 15px;
    .内容区 {
        display: flex;
        flex-direction: column;
        align-items: center;
        overflow: hidden auto;
        min-height: 0;
        width: 100%;
        gap: 15px;
        padding: max(30px, calc(env(safe-area-inset-top, 10px) + 3rem + 15px)) 0 max(15px, calc(env(safe-area-inset-bottom, 10px) + 15px));
    }
    .说明 {
        margin: 0;
        font-size: .85rem;
        line-height: 1.6;
        color: var(--文本次色);
        padding: 0 5px;
    }
    .源管理 {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 15px;
        width: 100%;
        border-radius: 1.5rem;
        background-color: var(--内容卡片);
        > div {
            display: flex;
            align-items: center;
            width: 100%;
            gap: 15px;
            min-height: 3.5rem;
            .平台信息 {
                display: flex;
                flex-grow: 1;
                min-width: 0;
                flex-direction: column;
                gap: 4px;
                justify-content: center;
                .源名 {
                    font-size: 1.05rem;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .cookie信息 {
                    font-size: .8rem;
                    color: var(--文本次色);
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
            }
            .清空单个 {
                height: 1.6rem;
                aspect-ratio: 1;
                flex-shrink: 0;
                background-color: var(--文本次色);
                -webkit-mask: var(--图标) center / contain no-repeat;
                mask: var(--图标) center / contain no-repeat;
                -webkit-tap-highlight-color: transparent;
                outline: none;
                user-select: none;
                cursor: pointer;
                transition: transform .15s;
                &:active { transform: scale(.86); }
            }
        }
        .空态 {
            padding: 20px 0;
            font-size: .95rem;
            color: var(--文本次色);
        }
    }
    .操作区 {
        width: 100%;
        padding: 0;
        > div {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 5px;
            height: 3rem;
            width: 100%;
            font-size: 1.05rem;
            border-radius: 1.5rem;
            white-space: nowrap;
            cursor: pointer;
            -webkit-tap-highlight-color: transparent;
            outline: none;
            user-select: none;
            span {
                height: 55%;
                aspect-ratio: 1;
                flex-shrink: 0;
                -webkit-mask: var(--图标) center / contain no-repeat;
                mask: var(--图标) center / contain no-repeat;
            }
        }
        .del {
            color: var(--小米红);
            background-color: var(--全部删除);
            transition: color .2s, background-color .2s;
            span { background-color: var(--小米红); }
            &:active {
                background-color: color-mix(in srgb, var(--全部删除) 85%, var(--小米红));
            }
            &.确认中 {
                color: var(--白);
                background-color: var(--小米红);
                span { background-color: var(--白); }
            }
        }
    }
}
.弹窗说明 {
    padding: 0 5px;
    font-size: .9rem;
    color: var(--文本次色);
}
</style>
