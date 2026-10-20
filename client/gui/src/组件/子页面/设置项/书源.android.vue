<template>
    <div class="子页" @click="取消确认清空">
        <TitleBar 标题="书源" @返回="$emit('返回')" />
        <div class="内容区">
            <div class="源管理">
                <div v-for="源 in 源列表" :key="源.标识">
                    <img v-if="源.图标地址" :src="源.图标地址" :alt="源.名称">
                    <!-- 没有图标时只留底色 底色由 CSS 的 img 的 background-color 给 -->
                    <img v-else :alt="源.名称">
                    <div class="平台信息">
                        <div class="源平台名称">{{ 显示名称(源) }}</div>
                        <div class="源平台id">{{ 源.标识 }}</div>
                    </div>
                    <span :style='{ "--图标": `url("${图标表.删除}")` }' @click="删除源(源)"></span>
                </div>
                <p v-if="!源列表.length" class="空态">还没有书源喵~</p>
            </div>
            <div class="源操作">
                <div class="del" :class="{ 确认中: 待确认清空 }" @click.stop="处理清空">
                    <span :style='{ "--图标": `url("${待确认清空 ? 图标表.永远删除 : 图标表.清空书源}")` }'></span>
                    {{ 待确认清空 ? "确认清空" : "清空书源" }}
                </div>
                <div class="add" @click.stop="打开添加"><span :style='{ "--图标": `url("${图标表.添加}")` }'></span>添加书源</div>
            </div>
        </div>

        <!-- 单个源的删除不可逆 连 js 文件一起删 所以走确认弹窗 不直接删 -->
        <Dialog :显示="!!待删除源" 类型="确认" 危险 标题="删除这个书源？"
                :确认文字="待删除源 ? `删除「${显示名称(待删除源)}」` : '删除'"
                @取消="待删除源 = null" @确认="确认删除源">
            <p class="弹窗说明">会同时删掉它的源文件，删了就找不回来了喵。</p>
        </Dialog>

        <!-- 添加书源 骨架阶段先占位 -->
        <Dialog :显示="显示添加" 类型="提示" 标题="添加书源" 确认文字="知道了"
                @取消="显示添加 = false" @确认="显示添加 = false">
            <p class="弹窗说明">还没做喵~ 之后会支持导入源文件。</p>
        </Dialog>
    </div>
</template>

<script>
import 图标表 from '../../../资源/页面图标.ts';
import { 安卓吐司 } from '../../../方法/吐司';
import { 私有目录, 读取文件, 读取文本, 写入文件, 删除文件, 列出文件, 写入图片, 读取图片 } from '../../../方法/存储';
import { 提取元信息 } from '../../../方法/源/元信息';
import TitleBar from '../../UI/标题栏.android.vue';
import Dialog from '../../UI/弹窗.android.vue';

// 源文件放这 初始数据 数据/源 会被释放进私有空间
const 源目录 = `${私有目录.数据}/源`;

// 源注册表 列表顺序以它为准 这正是建它的理由
// 按文件名扫出来是字母序 ESJ Zone.js 排在中文前面 不是人想要的顺序
//
// 它只回答 有哪些源 什么顺序 长什么样 不存代码 代码永远在 .js 里
// 里面给每个源留了 配置 空对象 那是源自己的持久化空间 比如文库8 的资源站选择
// 工具不解释它的内容 只负责存
//
// 名称 和 logo 注册进表 不是每次从源文件抠 源文件里那坨 base64 有几十上百 KB
// 每次进页面都读一遍纯属浪费 表里没有时才去抠一次并回填 之后只读表
// 代价是源改了 logo 而表里不知道 想刷新就把表里那两项清空 下次进页面重新抠
const 注册文件名 = '源注册';
// 图标落成真正的图片文件 相对 源目录
// 这个文件夹在初始数据里就建好了 数据/源/平台logo 空的 靠 include_dir 保留目录结构释放出来
// 注册表只存相对路径
//
// 为什么不把 base64 塞进注册表 那会让 源注册.json 变成一百多 KB 的一坨不可读文本
// 用户也没法用任何图片工具查看或替换
// 存成文件后 注册表小到能直接打开读 图标也能被任何看图软件打开 直接换掉
const 图标目录名 = '平台logo';

// 按命名约定找本源的图标 平台logo/标识.任意后缀 协议 §9.2
//
// 为什么只能找而不是读 图标不进源文件 协议明说图标不放元信息里
// 所以除了这份注册表 没有任何地方声明过它 表里没有就按约定猜一次
// 猜错了也无害 只是没图标 走默认底色
async function 找平台图标(标识) {
    if (!标识) return '';
    const 名单 = await 列出文件(`${源目录}/${图标目录名}`);
    const 命中 = 名单.find((名) => 名.replace(/\.[^.]+$/, '') === 标识);
    return 命中 ? `${图标目录名}/${命中}` : '';
}

// 把 data URL 形式的图标落成图片文件 返它在 源目录 下的相对路径 失败返空串
//
// 后缀从 data URL 的 MIME 里取 别硬编码成 png 源里放的可能本来就是 jpg 或 gif
function 存图标为文件(标识, data网址) {
    const 命中 = String(data网址).match(/^data:image\/([a-z0-9.+-]+);base64,(.+)$/i);
    if (!命中) return '';
    const 原名 = 命中[1].toLowerCase();
    const 后缀 = 原名 === 'jpeg' ? 'jpg' : 原名;
    const 相对路径 = `${图标目录名}/${标识}.${后缀}`;
    // 原生桥要的是相对包目录的路径 源目录本身就是相对包目录的
    const 结果 = 写入图片(`${源目录}/${相对路径}`, 命中[2]);
    return 结果.成功 ? 相对路径 : '';
}

// 表里的 图标 字段 相对路径 转成能直接喂给 img 的 data URL 读不到返空串 走默认底色
function 读图标为地址(相对路径) {
    if (!相对路径) return '';
    if (相对路径.startsWith('data:')) return 相对路径; // 兜底 还没落盘的旧数据
    const 数据 = 读取图片(`${源目录}/${相对路径}`);
    if (!数据) return '';
    const 后缀 = (相对路径.split('.').pop() || 'png').toLowerCase();
    return `data:image/${后缀 === 'jpg' ? 'jpeg' : 后缀};base64,${数据}`;
}

export default {
    name: "书源",
    emits: ["返回"],
    components: { TitleBar, Dialog },
    data() {
        return {
            图标表,
            源列表: [],
            待确认清空: false,
            清空定时器: null,
            待删除源: null,   // 正在等确认的那一个 null 表示确认弹窗关着
            显示添加: false,
        };
    },
    async mounted() {
        await this.刷新源列表();
    },
    beforeUnmount() {
        clearTimeout(this.清空定时器);
    },
    methods: {
        显示名称(源) {
            return 源.自定义名称 || 源.名称;
        },

        // 扫 源目录 并与注册表对齐 注册表里的顺序就是显示顺序 这里只做两件修补
        //   文件已经不在的 从表里剔除
        //   磁盘上有但没登记过的 追加到末尾 不动已有顺序
        // 有修补就写回 这样注册表既是权威 又不会因为一次误删就坏死
        // 文件不存在 首次运行 就按扫到的顺序全量生成
        async 刷新源列表() {
            const 磁盘上的 = (await 列出文件(源目录)).filter((名) => 名.endsWith('.js'));
            let 注册 = await 读取文件(源目录, 注册文件名, null);
            if (!Array.isArray(注册)) 注册 = [];

            const 在盘上 = new Set(磁盘上的);
            const 已登记 = new Set(注册.map((项) => 项.文件));
            const 对齐后 = 注册.filter((项) => 在盘上.has(项.文件));
            for (const 文件名 of 磁盘上的) {
                if (!已登记.has(文件名)) 对齐后.push({ 标识: '', 文件: 文件名, 名称: '', 图标: '', 自定义名称: '', 配置: {} });
            }
            let 表变过 = 对齐后.length !== 注册.length;

            // 元信息 表里有就用表里的 缺哪个才去源文件读一次
            // 读出来顺手回填 所以正常情况下只有首次或手工清空过才会真读源文件
            for (const 项 of 对齐后) {
                if (项.标识 && 项.名称 && 项.图标) continue;
                const 文本 = await 读取文本(源目录, 项.文件);
                // 静态提取 协议 §6 剥注释 平衡括号扫描 JSON.parse 全程不执行源
                // 旧版本这里正则抠 const 源id 协议重构后元信息改成 export const 元信息
                // 那个正则抠不到了
                const { 对象 } = 提取元信息(文本);
                const 标识 = 项.标识 || 对象?.标识 || 项.文件.replace(/\.js$/, '');
                const 名称 = 项.名称 || 对象?.名称 || 标识;
                // 图标 源文件里没有 协议 §9.2 明说图标不进元信息 按命名约定找文件
                const 图标 = 项.图标 || (await 找平台图标(标识));
                if (标识 !== 项.标识 || 名称 !== 项.名称 || 图标 !== 项.图标) {
                    项.标识 = 标识;
                    项.名称 = 名称;
                    项.图标 = 图标;
                    表变过 = true;
                }
            }

            // 图标落盘 表里存的应该是相对路径 若还是内联 base64
            // 首次刚抠出来或旧版数据 就落成图片文件 表里改存路径
            for (const 项 of 对齐后) {
                if (!项.图标?.startsWith('data:')) continue;
                const 落盘路径 = 存图标为文件(项.标识, 项.图标);
                if (落盘路径) {
                    项.图标 = 落盘路径;
                    表变过 = true;
                }
            }

            this.源列表 = 对齐后.map((项) => ({
                文件名: 项.文件,
                标识: 项.标识,
                名称: 项.名称,
                图标地址: 读图标为地址(项.图标),
                自定义名称: 项.自定义名称 || '',
            }));
            if (表变过) await 写入文件(源目录, 注册文件名, 对齐后);
        },

        // ── 删除单个
        删除源(源) {
            this.待删除源 = 源;
        },
        async 确认删除源() {
            const 源 = this.待删除源;
            if (!源) return;
            this.待删除源 = null;
            await 删除文件(源目录, 源.文件名);
            const 注册 = ((await 读取文件(源目录, 注册文件名, null)) ?? []).filter(
                (项) => 项.文件 !== 源.文件名,
            );
            await 写入文件(源目录, 注册文件名, 注册);
            await this.刷新源列表();
            安卓吐司(`已删除「${this.显示名称(源)}」`);
        },

        // ── 清空全部 两段确认 第一次点变成确认清空 3 秒不点自动撤回
        //
        // 撤回有两条路 定时器到期 和 点了别的地方 后者由根元素的 click 触发
        // .del 和 .add 都写了 click.stop 所以点它们不会冒到根 不会误撤销
        // 光有定时器不够 都点到别处去了还问要不要清空 很别扭
        处理清空() {
            if (!this.待确认清空) {
                if (!this.源列表.length) {
                    安卓吐司('还没有书源喵');
                    return;
                }
                this.待确认清空 = true;
                this.清空定时器 = setTimeout(() => { this.待确认清空 = false; }, 3000);
                return;
            }
            clearTimeout(this.清空定时器);
            this.真清空();
        },
        async 真清空() {
            this.待确认清空 = false;
            for (const 源 of this.源列表) {
                await 删除文件(源目录, 源.文件名);
            }
            await 写入文件(源目录, 注册文件名, []);
            await this.刷新源列表();
            安卓吐司('已清空书源');
        },

        // 撤销确认清空态 点了页面别处就调它
        取消确认清空() {
            if (!this.待确认清空) return;
            clearTimeout(this.清空定时器);
            this.待确认清空 = false;
        },

        // ── 添加 骨架阶段占位
        打开添加() {
            this.显示添加 = true;
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
        padding: max(30px, calc(env(safe-area-inset-top, 10px) + 3rem + 15px)) 0 max(15px, env(safe-area-inset-bottom, 0) * 1.5);
    }
    .源管理 {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 15px;
        padding: 15px;
        width: 100%;
        border-radius: 1.5rem;
        background-color: var(--内容卡片);
        > div {   /* 具体的源 */
            display: flex;
            align-items: center;
            height: 3.5rem;
            width: 100%;
            gap: 15px;
            img {
                height: 80%;
                border-radius: 50%;
                object-fit: cover;
                object-position: center;
            }
            img, span {
                aspect-ratio: 1;
            }
            span {
                height: 50%;
                background-color: var(--小米红);
                -webkit-mask: var(--图标) center / contain no-repeat;
                mask: var(--图标) center / contain no-repeat;
                -webkit-tap-highlight-color: transparent;
            }
            .平台信息 {
                display: flex;
                height: 100%;
                flex-grow: 1;
                min-width: 0;
                flex-direction: column;
                justify-content: center;
                > div:first-child {
                    font-size: 1.1rem;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                > div:last-child {
                    font-size: .8rem;
                    color: var(--文本次色);
                }
            }
        }
        .空态 {
            padding: 30px 0;
            font-size: .95rem;
            color: var(--文本次色);
        }
    }
    .源操作 {
        padding: 0;
        display: flex;
        width: 100%;
        gap: 15px;
        transition: gap .35s ease;
        &:has(.del.确认中) {
            gap: 0;
        }
        > div {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 5px;
            height: 3rem;
            flex-grow: 1;
            flex-basis: 0;
            overflow: hidden;
            font-size: 1.1rem;
            border-radius: 1.5rem;
            white-space: nowrap;
            transition: flex-grow .35s cubic-bezier(0.22, 0.61, 0.36, 1),
                        background-color .35s ease,
                        color .35s ease,
                        opacity .3s ease;
            span {
                height: 60%;
                aspect-ratio: 1;
                flex-shrink: 0;
                -webkit-mask: var(--图标) center / contain no-repeat;
                mask: var(--图标) center / contain no-repeat;
            }
        }
        .add {
            color: var(--主题色);
            background-color: var(--添加新的);
            span {background-color: var(--主题色);}
        }
        .del {
            color: var(--小米红);
            background-color: var(--全部删除);
            span {background-color: var(--小米红);}
            &.确认中 {
                flex-grow: 3;
                color: var(--白);
                background-color: var(--小米红);
                span {background-color: var(--白);}
            }
        }
        .del.确认中 ~ .add {
            flex-grow: 0;
            opacity: 0;
        }
    }
}

/* 弹窗内的说明文字 插槽内容落在本页作用域 所以这里选得中 */
.弹窗说明 {
    padding: 0 5px;
    font-size: .9rem;
    color: var(--文本次色);
}
</style>
