<template>
    <!-- 整个子页接一个 click：只要点在任何**别的地方**就退出「清空确认态」 -->
    <div class="子页" @click="取消清空">
        <TitleBar 标题="账号与安全" @返回="$emit('返回')" />

        <div class="内容区">
            <div class="自定义" data-卡片分类="个人信息">
                <div class="昵称"><input v-model.trim="个人资料.昵称" placeholder="昵称" @change="保存"></div>
                <div class="简介"><input v-model.trim="个人资料.简介" placeholder="简介" @change="保存"></div>
            </div>

            <div class="账号管理" data-卡片分类="账号管理">
                <div v-for="项 in 账号列表" :key="项.id" @click="打开详情(项)">
                    <img v-if="头像地址(项)" :src="头像地址(项)" :alt="项.平台">
                    <span v-else class="默认头像" :style='{ "--图标": `url("${图标表.账户圈}")` }'></span>
                    <div class="账号信息">
                        <div>{{ 项.平台 }}</div>
                        <div>{{ 项.账号 }}</div>
                    </div>
                    <button :style='{ "--图标": `url("${图标表.登出}")` }' @click.stop="请求登出(项)"></button>
                </div>
                <div v-if="!账号列表.length" class="空账号">
                    <span :style='{ "--图标": `url("${图标表.无账户}")` }'></span>
                    <p>还没有添加账号</p>
                </div>
            </div>

            <div class="账号操作">
                <div class="del" :class="{ 确认中: 待确认清空 }" @click.stop="处理清空">
                    <span :style='{ "--图标": `url("${待确认清空 ? 图标表.永远删除 : 图标表.清空账号}")` }'></span>
                    {{ 待确认清空 ? "确认清空" : "清空账号" }}
                </div>
                <div class="add" @click.stop="打开添加">
                    <span :style='{ "--图标": `url("${图标表.添加}")` }'></span>添加账号
                </div>
            </div>
        </div>

        <!-- ── 操作弹窗：添加账号（带表单） ── -->
        <Dialog :显示="显示添加" 类型="操作" 标题="添加账号" 确认文字="添加"
                @取消="关闭添加" @确认="确认添加">
            <div class="头像选择" @click="选择新账号头像">
                <img v-if="新账号.头像" :src="新账号.头像" alt="头像">
                <span v-else class="默认头像" :style='{ "--图标": `url("${图标表.账户圈}")` }'></span>
                <p>{{ 新账号.头像 ? "点击更换头像" : "点头像选一张" }}</p>
            </div>
            <label>平台<input v-model.trim="新账号.平台" placeholder="如 wk8" autocomplete="off"></label>
            <label>账号<input v-model.trim="新账号.账号" autocomplete="off"></label>
            <label>密码<input v-model.trim="新账号.密码" autocomplete="off"></label>
        </Dialog>

        <!-- ── 操作弹窗：账号信息（可以直接改，改完点保存） ── -->
        <Dialog :显示="!!编辑项" 类型="操作" 标题="账号信息" 确认文字="保存"
                @取消="编辑项 = null" @确认="保存详情">
            <template v-if="编辑项">
                <div class="头像选择" @click="更换详情头像">
                    <img v-if="头像地址(编辑项)" :src="头像地址(编辑项)" alt="头像">
                    <span v-else class="默认头像" :style='{ "--图标": `url("${图标表.账户圈}")` }'></span>
                    <p>点击更换头像</p>
                </div>
                <label>平台<input v-model.trim="编辑项.平台" autocomplete="off"></label>
                <label>账号<input v-model.trim="编辑项.账号" autocomplete="off"></label>
                <label>密码<input v-model.trim="编辑项.密码" autocomplete="off"></label>
            </template>
        </Dialog>

        <!-- ── 确认弹窗：登出（不可逆，走危险配色） ── -->
        <Dialog :显示="!!待登出" 类型="确认" 标题="登出账号" 确认文字="登出" 危险
                @取消="待登出 = null" @确认="确认登出">
            <p v-if="待登出" class="弹窗文字">
                确定要登出「{{ 待登出.平台 }}」吗？<br>
                这条账号和它的头像都会一起删掉。
            </p>
        </Dialog>
    </div>
</template>

<script>
import 图标表 from '../../../资源/页面图标.ts';
import { 初始实体, 读取实体, 替换实体, 资源地址, 预载私有资源, 保存私有资源, 删除私有资源, 图片扩展名 } from '../../../方法/获取信息';
import { 选择图片 } from '../../../方法/文件访问';
import { 安卓吐司 } from '../../../方法/吐司';
import TitleBar from '../../UI/标题栏.android.vue';
import Dialog from '../../UI/弹窗.android.vue';

const 空资料 = { 昵称: '', 简介: '', 头像: '' };

export default {
    name: "账号",
    components: { TitleBar, Dialog },
    emits: ["返回"],
    data() {
        // 先用打包数据同步起手：首帧就有内容，不必等 IPC 回来再跳一下
        const 盘上 = 初始实体('账号') ?? {};
        return {
            图标表,
            个人资料: { ...空资料, ...(盘上.个人资料 ?? {}) },
            账号列表: Array.isArray(盘上.账号列表) ? 盘上.账号列表 : [],
            待确认清空: false,
            显示添加: false,
            新账号: { 平台: '', 账号: '', 密码: '', 头像: '' },
            编辑项: null, // 打开详情时**拷一份**来编辑；点「保存」才写回列表
            待登出: null, // 登出确认弹窗要删的那条（null = 不显示）
            // id → 可显示的头像地址。换过的头像落在私有空间里、要读文件（异步），
            // 而模板只能同步取 —— 所以单独维护这张表，由 刷新头像地址() 填。
            // 表里没有（= 还没预载到）就回落到「账户圈」图标兜底。
            头像地址表: {},
        };
    },
    async mounted() {
        const 盘上 = (await 读取实体('账号')) ?? {};
        this.个人资料 = { ...空资料, ...(盘上.个人资料 ?? {}) };
        this.账号列表 = Array.isArray(盘上.账号列表) ? 盘上.账号列表 : [];
        await this.刷新头像地址();
    },
    methods: {
        // 空串 = 没有真实头像 → 模板改用「账户圈」图标兜底（底色走 --设置项-账号）
        头像地址(项) {
            // 草稿里刚选的头像还只是内存里的 data URL（没落文件）→ 直接拿它预览
            if (项?.头像 && String(项.头像).startsWith('data:')) return 项.头像;
            return this.头像地址表[项?.id] ?? '';
        },
        // 私有头像要读盘（异步），模板只能同步取 —— 所以先预载一轮，再**整表替换**
        // （整表替换是响应式的，模板里 头像地址() 读过这张表，会跟着重渲染）。
        async 刷新头像地址() {
            await Promise.all(
                this.账号列表.filter((条) => 条?.头像).map((条) => 预载私有资源(条.头像)),
            );
            const 表 = {};
            for (const 条 of this.账号列表) 表[条.id] = 条?.头像 ? 资源地址(条.头像) : '';
            this.头像地址表 = 表;
        },
        // 整份写回。账号列表是**数组**，字段级接口（保存信息 / 删除信息）够不着它，
        // 所以统一走 替换实体 —— 读-改-写都在内存里做完，只落一次盘。
         async 落盘(提示 = '已保存喵~') {
            const 成功 = await 替换实体('账号', {
                个人资料: this.个人资料,
                账号列表: this.账号列表,
            });
            if (成功) 安卓吐司(提示);
            return 成功;
        },
        async 保存() {
            await this.落盘();
        },
        // 点登出按钮只是「请求」—— 删账号不可逆，先弹确认
        请求登出(项) {
            if (项) this.待登出 = 项;
        },
        async 确认登出() {
            const 项 = this.待登出;
            if (!项) return;
            this.待登出 = null;
            const 新的 = this.账号列表.filter((条) => 条.id !== 项.id);
            if (新的.length === this.账号列表.length) return;
            this.账号列表 = 新的;
            if (this.编辑项?.id === 项.id) this.编辑项 = null;
            // 账号没了，头像文件也跟着删 —— 不然私有空间会攒下一堆没人引用的孤儿
            await 删除私有资源(项.头像);
            await this.落盘('已登出');
            await this.刷新头像地址();
        },

        // ── 清空：按钮自己就是确认态 ──
        // 第一次点 = 进入确认态（按钮占满 + 变红）；再点 = 真清。
        // 点页面上任何别的地方会冒泡到 .子页 的 click → 取消清空。
        取消清空() {
            if (this.待确认清空) this.待确认清空 = false;
        },
        async 处理清空() {
            if (!this.待确认清空) {
                if (!this.账号列表.length) {
                    安卓吐司('本来就没有账号，你想清理什么喵~');
                    return;
                }
                this.待确认清空 = true;
                return;
            }
            this.待确认清空 = false;
            const 旧的 = this.账号列表;
            this.账号列表 = [];
            // 头像文件一并清掉。个人资料不在此列 —— 那是「本应用自己」的东西，清空账号不该带走它。
            await Promise.all(旧的.map((条) => 删除私有资源(条.头像)));
            await this.落盘('账号已清空');
            await this.刷新头像地址();
        },

        // ── 账号信息（操作弹窗，可直接改） ──
        打开详情(项) {
            // 拷一份再编辑 —— 直接编辑列表里那个对象的话，v-model 会「边打字边改列表」，
            // 点「取消」根本撤不回来（列表上显示的字也已经变了）。
            this.编辑项 = { ...项 };
        },
        // 换头像只改**草稿**（先放一个临时 data URL），等点「保存」才落文件 ——
        // 不然用户换了头像又不保存，会在私有空间留下一个没人引用的文件。
        async 更换详情头像() {
            if (!this.编辑项) return;
            // 安卓走原生「相册选图 → 系统裁剪界面」，比例由用户在裁剪界面里定；
            // PC / 没有裁剪实现的机型自动降级成「只选不裁」（见 方法/文件访问.android.js）
            const 地址 = await 选择图片({ 最大边: 512 });
            if (!地址) return;
            // 保存时兜一道格式：我们压出来的一定是 JPEG，这条拦的是「压不动、退回原样」的
            // 那些格式（最典型是 HEIC）。不拦的话会存下一个后缀 .jpg、内容却不是的文件。
            if (!图片扩展名(地址)) {
                安卓吐司('对不起喵~ 只支持 jpg / png 图片喵~');
                return;
            }
            this.编辑项 = { ...this.编辑项, 头像: 地址 };
        },

        // 保存账号信息（平台 / 账号 / 密码 / 头像）
        async 保存详情() {
            const 草稿 = this.编辑项;
            if (!草稿) return;
            const 平台 = String(草稿.平台 ?? '').trim();
            const 账号 = String(草稿.账号 ?? '').trim();
            if (!平台 || !账号) {
                安卓吐司('你至少填下平台和账号喵！');
                return;
            }
            const 原项 = this.账号列表.find((条) => 条.id === 草稿.id);
            let 头像 = 草稿.头像 ?? '';
            // 草稿里的头像还是 data URL = 这次刚选的 → **到这里才落文件**。
            // 落成文件、数据里只记路径，否则一张头像几十万字符全塞进账号 JSON，
            // 每次落盘都要重写整份，那个 JSON 也就没法打开看了。
            if (String(头像).startsWith('data:')) {
                const 路径 = await 保存私有资源(`账号头像/${草稿.id}`, 头像);
                if (!路径) {
                    安卓吐司('头像保存失败了喵..');
                    return;
                }
                // 旧文件顺手删掉 —— 扩展名可能变了（png → jpg），不删就留孤儿
                await 删除私有资源(原项?.头像);
                头像 = 路径;
            }
            this.账号列表 = this.账号列表.map((条) =>
                条.id === 草稿.id
                    ? { ...条, 平台, 账号, 密码: String(草稿.密码 ?? '').trim(), 头像 }
                    : 条,
            );
            this.编辑项 = null;
            await this.落盘('已保存');
            await this.刷新头像地址();
        },

        // ── 添加 ──
        打开添加() {
            this.新账号 = { 平台: '', 账号: '', 密码: '', 头像: '' };
            this.显示添加 = true;
        },
        关闭添加() {
            this.显示添加 = false;
        },
        async 选择新账号头像() {
            // 安卓走原生「相册选图 → 系统裁剪界面」，比例由用户在裁剪界面里定；
            // PC / 没有裁剪实现的机型自动降级成「只选不裁」（见 方法/文件访问.android.js）
            const 地址 = await 选择图片({ 最大边: 512 });
            if (!地址) return;
            // 这里只是暂存，格式等到「确认添加」真保存时再判 —— 选择时不该拦人
            this.新账号 = { ...this.新账号, 头像: 地址 };
        },
        async 确认添加() {
            const 平台 = this.新账号.平台.trim();
            const 账号 = this.新账号.账号.trim();
            if (!平台 || !账号) {
                安卓吐司('平台和账号都要填喵！');
                return;
            }
            const id = this.生成id();
            // 头像到这一步才落文件 —— 因为文件名里的 id 现在才定下来。
            // 用户选了头像又取消添加的话，那个 data URL 只是随内存丢掉，不会留下垃圾文件。
            let 头像 = '';
            if (this.新账号.头像) {
                // 再查一遍格式（`选择新账号头像` 已经拦过一道，这里防绕过）
                if (图片扩展名(this.新账号.头像)) {
                    头像 = await 保存私有资源(`账号头像/${id}`, this.新账号.头像);
                    if (!头像) 安卓吐司('坏了！头像没存住...先加个不带头像的喵');
                } else {
                    安卓吐司('头像只支持 jpg / png 图片喵~ 先加个不带头像的喵~');
                }
            }
            this.账号列表 = [
                ...this.账号列表,
                {
                    id,
                    平台,
                    账号,
                    密码: this.新账号.密码.trim(),
                    头像, // 空串 → 走「账户圈」兜底
                },
            ];
            this.显示添加 = false;
            await this.落盘('已添加');
            await this.刷新头像地址();
        },
        // id 只要求「本机唯一」：取现有**数字** id 的最大值 +1。
        // 数字串比随机字符好读，手改 JSON 时照同一个规则加也不会撞。
        生成id() {
            const 数字们 = this.账号列表
                .map((项) => parseInt(项.id, 10))
                .filter((值) => Number.isFinite(值));
            return String((数字们.length ? Math.max(...数字们) : 0) + 1);
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
        padding: max(30px, calc(env(safe-area-inset-top, 10px) + 3.5rem)) 0 max(15px, calc(env(safe-area-inset-bottom, 10px) + 5px));
        > * {flex-shrink: 0;}
        > div:not(:last-child) {
            position: relative;
            display: flex;
            flex-direction: column;
            width: 100%;
            padding: 40px 15px 15px;
            border-radius: 1.5rem;
            background-color: var(--内容卡片);
            &::before {
                position: absolute;
                content: attr(data-卡片分类);
                top: 15px;
                left: 15px;
                font-size: .9rem;
                color: var(--主题色);
            }
        }
        .自定义 {
            gap: 3px;
            margin-top: 25px;
            padding-left: 0 !important;
            > :first-child {
                position: relative;
                &::after {
                    position: absolute;
                    content: '';
                    height: 1px;
                    width: 95%;
                    bottom: -3px;
                    left: 50%;
                    transform: translateX(-48%);
                    background-color: var(--设置项-分隔线);
                }
            }
            input {
                width: 100%;
                height: 2.5rem;
                border-radius: 1.5rem;
                font-size: 1.1rem;
                border: none;
                padding: 0 15px;
                background: transparent;
                outline: transparent;
            }
        }
        .账号管理 {
            gap: 15px;
            transition: all .3s;
            > div {
                position: relative;
                display: flex;
                align-items: center;
                height: 4rem;
                gap: 15px;
                transition: all .3s;
                img {
                    height: 80%;
                    aspect-ratio: 1;
                    border-radius: 50%;
                    /* cover 而不是 contain：头像存的是方形（选图时中心裁切过），
                       但老数据可能是从别处来的非方形图，contain 会在圆里留白 */
                    object-fit: cover;
                    object-position: center;
                    background-color: var(--账号头像);
                }
                /* 没有真实头像时的兜底：账户圈图标用 --设置项-账号 上色，
                   底色用 --账号头像（圆底） */
                .默认头像 {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 80%;
                    aspect-ratio: 1;
                    flex-shrink: 0;
                    border-radius: 50%;
                    background-color: var(--账号头像);
                    &::after {
                        content: '';
                        width: 62.9%;
                        aspect-ratio: 1;
                        background-color: var(--设置项-账号);
                        -webkit-mask: var(--图标) center / contain no-repeat;
                        mask: var(--图标) center / contain no-repeat;
                    }
                }
                .账号信息 {
                    display: flex;
                    height: 100%;
                    flex-direction: column;
                    justify-content: center;
                    > div:first-child {
                        font-size: 1.2rem;
                    }
                    > div:last-child {
                        font-size: .8rem;
                        color: var(--文本次色);
                    }
                }
                button {
                    height: 45%;
                    aspect-ratio: 1;
                    margin-left: auto;
                    border: none;
                    background-color: var(--小米红);
                    -webkit-mask: var(--图标) center / contain no-repeat;
                    mask: var(--图标) center / contain no-repeat;
                }
            }
            > div:not(:last-of-type)::after {
                position: absolute;
                content: '';
                bottom: -8px;
                height: 1px;
                width: 85%;
                left: 50%;
                transform: translateX(-40%);
                background-color: var(--设置项-分隔线);
            }
            /* 空态：一个账号都没有时占位。它自己是 :last-of-type，所以不会画分隔线 */
            .空账号 {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 8px;
                padding: 5px 0;
                span {
                    height: 3rem;
                    aspect-ratio: 1;
                    background-color: var(--文本淡色);
                    -webkit-mask: var(--图标) center / contain no-repeat;
                    mask: var(--图标) center / contain no-repeat;
                }
                p {
                    font-size: .9rem;
                    color: var(--文本次色);
                }
            }
        }
        .账号操作 {
            padding: 0;
            display: flex;
            width: 100%;
            gap: 15px;
            /* 进入确认态时两个按钮之间的缝也要收掉，否则「占满」的右边会空一条 */
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
}

/* 确认弹窗（登出）里那段说明。它属于「内容」，所以留在使用方这边 ——
   弹窗的骨架（遮罩 / 本体 / 标题 / 按钮 / 进出动画）都收在 组件/UI/弹窗.android.vue 里，
   三类弹窗共用那一套，靠类名前缀区分。 */
.弹窗文字 {
    padding: 0 5px 5px;
    font-size: .95rem;
    line-height: 1.5;
    text-align: center;
    color: var(--文本次色);
}
/* 弹窗里的输入行（属于「内容」，留在使用方） */
label {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: .95rem;
    color: var(--文本次色);
    input {
        flex: 1;
        height: 3rem;
        padding: 0 15px;
        border: none;
        outline: none;
        border-radius: 1.5rem;
        font-size: 1.1rem;
        color: var(--文本主色);
        background-color: var(--内容卡片);
    }
}
/* 按钮组（取消 / 确认 / 危险）也在 组件/UI/弹窗.android.vue 里，三类共用 */

/* 确认弹窗里的头像选择区（添加 / 详情共用）：调系统图片选择器 */
.头像选择 {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 5px 0 10px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    img {
        width: 5rem;
        height: 5rem;
        border-radius: 50%;
        object-fit: cover;
        background-color: var(--账号头像);
    }
    .默认头像 {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 5rem;
        height: 5rem;
        flex-shrink: 0;
        border-radius: 50%;
        background-color: var(--账号头像);
        &::after {
            content: '';
            width: 62.9%;
            aspect-ratio: 1;
            background-color: var(--设置项-账号);
            -webkit-mask: var(--图标) center / contain no-repeat;
            mask: var(--图标) center / contain no-repeat;
        }
    }
    p {
        font-size: .85rem;
        color: var(--文本次色);
    }
}

/* 「名 — 值」行已经不用了：账号信息从「只看」改成「可编辑」，值那侧换成了输入框 */
</style>
