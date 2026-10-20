<template>
    <div class="子页">
        <TitleBar 标题="资源目录" @返回="$emit('返回')" />

        <div class="内容区">
            <div v-for="项 in 目录项列表" :key="项.键" :data-标题="项.标题" :data-说明="项.说明">
                <div>
                    <!-- 绝对路径又长又不能照抄 所以用 文件 给个 去看 的入口 -->
                    <span :style='{ "--图标": `url("${图标表.文件夹}")` }' @click="打开(项)"></span>
                    <div class="目录栏" :style="{ color: 项.自定义 ? 'var(--文本主色)' : 'var(--文本次色)' }" @click="打开(项)">{{ 显示路径(项) }}</div>
                    <!-- 只有可自定义的项目才给按钮 缓存目录改了应用找不着自己的缓存 -->
                    <span v-if="项.可自定义" :style='{ "--图标": `url("${图标表.创建新文件夹}")` }' @click="选择目录(项)"></span>
                </div>

                <div v-if="项.私密缓存" class="私密行" @click="私密提示">
                    <span :style='{ "--图标": `url("${图标表.文件夹}")` }'></span>
                    <div class="目录栏" :style="{color: 'var(--文本次色)'}">{{ 项.私密缓存 }}</div>
                </div>
            </div>
        </div>

        <!-- 选择目录弹窗 -->
        <Dialog :显示="!!编辑项" 类型="操作" :标题="选择标题" 确认文字="确定" @取消="编辑项 = null" @确认="确认选择">
            <p class="弹窗说明">当前：{{ 草稿显示 }}</p>
            <!-- SAF 手机里任意位置 授权范围由用户在系统选择器里划定 -->
            <button class="挑目录" @click="挑手机目录">选择手机里其他你喜欢的位置</button>
            <div class="目录选项">
                <button v-for="名 in 候选目录" :key="名" :class="{ 选中: 候选已选(名) }" @click="草稿 = 空间目录(候选路径(名))">默认的{{ 名 }}位置</button>
                <p v-if="!候选目录.length" class="空提示">还...没有可选文件夹?!既然你删了默认的那你新建一个吧</p>
            </div>
        </Dialog>

    </div>
</template>

<script>
import 图标表 from '../../../资源/页面图标.ts';
import { 安卓吐司 } from '../../../方法/吐司';
import { 取值, 设值 } from '../../../方法/更新设置';
import {空间目录, 是空间目录, 是授权目录,列子目录, 建目录, 打开目录, 选目录, 打开授权目录, 确保子目录, 写文本到,
} from '../../../方法/开放空间';
import TitleBar from '../../UI/标题栏.android.vue';
import Dialog from '../../UI/弹窗.android.vue';

const 目录定义 = [
    { 键: '下载', 标题: '下载', 说明: '关乎你下载的资源会出现在哪里', 默认: 'files/数据/下载', 可自定义: true },
    { 键: '导出', 标题: '导出', 说明: '关乎你导出的文件会出现在哪里', 默认: 'files/数据/导出', 可自定义: true },
    { 键: '缓存', 标题: '缓存', 说明: '应用缓存，要是嫌偶肥就自己清理喵！喵很爱干净的喵！', 默认: 'cache', 可自定义: false },
];

const 可选父目录 = 'files/数据';
const 隐藏目录 = ['用户资源'];
const 空间名 = '本喵开放空间/';
// 存哪儿 应用设置里的 下载.资源目录 不是独立的设置文件
// 设置是一个文件装全部分组 分组只是里面的一个键 见 方法/更新设置.share.js
const 设置路径 = '下载.资源目录';

export default {
    name: 'ResourceDirectory',
    components: { TitleBar, Dialog },
    emits: ['返回'],
    data() {
        return {
            图标表,
            空间目录,
            // 下载.资源目录 的值是 下载 和 导出 两个描述符或空串
            // 空串代表用默认 这也是初始数据的写法 所以键一直在是常态
            目录设置: {},
            编辑项: null,
            草稿: null,
            新文件夹名: '',
            候选目录: [],
        };
    },
    computed: {
        目录项列表() {
            return 目录定义.map((定义) => {
                const 记录 = this.目录设置[定义.键];
                // 有没有自定义的判据是值是不是描述符对象 不是键在不在
                // 键一直在 默认写着空串 见上面 目录设置 的注释
                const 自定义 = !!记录 && typeof 记录 === 'object';
                return {
                    ...定义,
                    描述符: 自定义 ? 记录 : 空间目录(定义.默认),
                    自定义,
                    私密缓存: 定义.键 === '缓存' ? '本喵私密空间/cache/' : '',
                };
            });
        },
        选择标题() {
            return this.编辑项 ? `选择${this.编辑项.标题}目录` : '';
        },
        草稿显示() {
            return this.描述符文本(this.草稿);
        },
    },
    async mounted() {
        this.目录设置 = (await 取值(设置路径, {})) ?? {};
    },
    methods: {
        // 描述符 转成给人看的路径 授权目录显示的是实际落点
        // 和默认模式对称 默认那条显示的也是落点 本喵开放空间/files/数据/下载
        // 而且显示什么就打开什么 点进去就能看到文件
        // 子目录 兜底判空 刚选完目录还没确认时它可能是空的 那时只显示父目录名
        描述符文本(描述符) {
            if (!描述符) return '';
            if (是授权目录(描述符)) {
                const 尾 = 描述符.子目录 ? `${描述符.子目录}/` : '';
                return `${描述符.名称}/${尾}`;
            }
            return `${空间名}${描述符.路径}/`;
        },
        显示路径(项) {
            return this.描述符文本(项.描述符);
        },
        打开(项) {
            // 授权目录传 uri 加子目录 原生侧会先确保子目录在 被删了就地重建
            const 结果 = 是授权目录(项.描述符)
                ? 打开授权目录(项.描述符.uri, 项.描述符.子目录)
                : 打开目录(项.描述符.路径);
            if (!结果.成功) 安卓吐司(`打不开这个目录（${结果.状态}）`);
        },
        选择目录(项) {
            this.编辑项 = 项;
            this.草稿 = 项.描述符;
            this.新文件夹名 = '';
            this.刷新候选();
        },
        刷新候选() {
            this.候选目录 = 列子目录(可选父目录).filter((名) => !隐藏目录.includes(名));
        },
        候选路径(名) {
            return `${可选父目录}/${名}`;
        },
        候选已选(名) {
            return 是空间目录(this.草稿) && this.草稿.路径 === this.候选路径(名);
        },
        // SAF 让用户选手机里任意位置 异步 用户取消时不改动草稿
        async 挑手机目录() {
            const { uri, 名称, 状态 } = await 选目录();
            if (!uri) {
                // 取消是用户主动放弃 不该弹提示
                if (!String(状态).startsWith('取消')) 安卓吐司(`选择失败（${状态}）`);
                return;
            }
            // 子目录名就是这一项的键 现在就填上 好让当前能显示完整落点
            // 但建目录留到点确定 那时才该产生副作用
            this.草稿 = { 类型: '授权', uri, 名称, 子目录: this.编辑项?.键 ?? '' };
        },
        async 新建文件夹() {
            const 名 = String(this.新文件夹名 || '').trim();
            if (!名) return;
            // 名字里带分隔符等于手写路径 能跳出这一层 直接挡掉
            if (名.includes('/') || 名.includes('\\')) {
                安卓吐司('文件夹名不能带斜杠');
                return;
            }
            const 相对 = this.候选路径(名);
            const 结果 = 建目录(相对);
            if (!结果.成功) {
                安卓吐司(`新建失败（${结果.状态}）`);
                return;
            }
            this.刷新候选();
            this.草稿 = 空间目录(相对);   // 建完顺手选上 —— 「新建」的目的大多就是用它
            this.新文件夹名 = '';
        },
        async 确认选择() {
            const 项 = this.编辑项;
            if (!项 || !this.草稿) return;
            let 草稿 = this.草稿;
            // 授权目录 先在里面对称地建出同名子目录 选下载目录就建 下载
            // 没有这一步的话 选的目录就只是个摆设 将来下载导出没有明确的落点
            // 用的是 ContentResolver SAF 给的是 content URI File 够不着
            if (是授权目录(草稿)) {
                // 先试建一次 建不出来就别保存 存一个用不了的目录比不存更糟
                // 但不存 落点 那个 URI 会随用户删目录而失效 只留 uri 加子目录
                // 让原生每次写入或打开前现算 顺带自愈 见 方法/开放空间.android.js
                if (!确保子目录(草稿.uri, 项.键)) {
                    安卓吐司(`没法在「${草稿.名称}」里创建「${项.键}」文件夹`);
                    return;
                }
                草稿 = { ...草稿, 子目录: 项.键 };
            }
            const 新的 = { ...this.目录设置 };
            // 选回默认就写回空串 不是删键 和初始数据的写法保持一致
            // 让 键永远在 空串代表用默认 成为唯一约定
            const 是默认 = 是空间目录(草稿) && 草稿.路径 === 项.默认;
            新的[项.键] = 是默认 ? '' : 草稿;
            await 设值(设置路径, 新的);
            this.目录设置 = 新的;
            this.编辑项 = null;
            // 授权目录要明确告诉用户我们在他的目录里建了东西 那是他的地盘
            安卓吐司(是授权目录(草稿) ? `已在「${草稿.名称}」里建好「${项.键}」` : '已保存');
        },
        // 临时 验证两种目录的落点能不能真的写进去
        // 空间模式走 File 授权模式走 ContentResolver 验证完连同模板里的 测试条 一起删
        测试写(键) {
            const 项 = this.目录项列表.find((x) => x.键 === 键);
            if (!项) return;
            const 描述符 = 项.描述符;
            const 内容 = [
                '喵小说 · 写入测试',
                `时间：${new Date().toLocaleString()}`,
                `项目：${键}`,
                `模式：${描述符.类型}`,
                `位置：${this.描述符文本(描述符)}`,
            ].join('\n');
            const 结果 = 写文本到(描述符, '喵小说测试.txt', 内容);
            安卓吐司(结果.成功 ? `已写入「${键}」（${描述符.类型}）` : `写入失败：${结果.状态}`);
        },
        私密提示() {
            安卓吐司('别想了喵~就是我想系统不会让你看的喵~');
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
    > * {flex-shrink: 0;}
    .内容区 {
        display: flex;
        flex-direction: column;
        align-items: center;
        overflow: hidden auto;
        width: 100%;
        gap: 35px;
        padding: max(30px, calc(env(safe-area-inset-top, 10px) + 3rem + 15px)) 0 max(15px, env(safe-area-inset-bottom, 0) * 1.5);
        > div {
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 15px;
            width: 100%;
            padding: 35px 15px 15px;
            border-radius: 1.5rem;
            font-size: 1.1rem;
            background-color: var(--内容卡片);
            &::before {
                position: absolute;
                content: attr(data-标题);
                top: 15px;
                left: 15px;
                font-size: .8rem;
                font-weight: 700;
                color: var(--主题色);
            }
            &::after {
                position: absolute;
                content: attr(data-说明);
                bottom: -25px;
                left: 15px;
                font-size: .8rem;
                color: var(--设置卡-分类名);
            }
            > div {         /* 子项目 */
                display: flex;
                align-items: center;
                justify-content: space-between;
                width: 100%;
                height: 2rem;
                gap: 5px;
                .目录栏 {
                    flex-grow: 1;
                    min-width: 0;          /* 不加就压不下去 ellipsis 不生效 */
                    font-size: .9rem;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                span {
                    height: 80%;
                    aspect-ratio: 1;
                    flex-shrink: 0;
                    background-color: var(--文本淡色);
                    -webkit-mask: var(--图标) center / contain no-repeat;
                    mask: var(--图标) center / contain no-repeat;
                    -webkit-tap-highlight-color: transparent;
                }
            }
        }
    }
}

/* ───────── 弹窗内部 插槽内容落在本页作用域 所以这些样式照样选中 ───────── */
.弹窗说明 {
    padding: 0 5px;
    font-size: .9rem;
    color: var(--文本次色);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
/* 选手机里其他位置 和下面那张可选列表是并列的两条路
   用描边样式区分开 不跟选中项的实心底色撞 */
.挑目录 {
    flex-shrink: 0;
    height: 3rem;
    border: 2px dashed var(--主题色);
    border-radius: 1.5rem;
    font-size: 1rem;
    color: var(--主题色);
    background-color: transparent;
    -webkit-tap-highlight-color: transparent;
}
.目录选项 {
    display: flex;
    gap: 8px;
    max-height: 26vh;
    overflow: hidden auto;
    button {
        flex-shrink: 0;
        height: 3rem;
        flex-grow: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 15px;
        border: 2px solid transparent;
        border-radius: 1.5rem;
        font-size: 1rem;
        text-align: left;
        color: var(--文本主色);
        background-color: var(--内容卡片);
        -webkit-tap-highlight-color: transparent;
        &.选中 {
            border-color: var(--主题色);
            color: var(--主题色);
        }
    }
    .空提示 {
        padding: 15px 0;
        text-align: center;
        font-size: .9rem;
        color: var(--文本淡色);
    }
}
.新建行 {
    display: flex;
    gap: 8px;
    input {
        flex: 1;
        min-width: 0;
        height: 3rem;
        padding: 0 15px;
        border: none;
        border-radius: 1rem;
        font-size: 1rem;
        color: var(--文本主色);
        background-color: var(--内容卡片);
        outline: none;
    }
    .新建 {
        flex: 0 0 auto;
        padding: 0 20px;
        border: none;
        border-radius: 1rem;
        font-size: 1rem;
        color: var(--主题色);
        background-color: var(--添加新的);
        -webkit-tap-highlight-color: transparent;
    }
}


.测试条 {
    position: absolute;
    left: 15px;
    right: 15px;
    bottom: max(15px, env(safe-area-inset-bottom, 15px));
    z-index: 20;
    display: flex;
    gap: 10px;
    button {
        flex: 1;
        height: 3rem;
        border: none;
        border-radius: 1rem;
        font-size: .9rem;
        color: var(--白);
        background-color: var(--主题色);
        opacity: .85;
        -webkit-tap-highlight-color: transparent;
    }
}
</style>
