<template>
    <div class="app-android" data-platform="android">
        <div class="核心内容区" @touchstart.passive="触碰开始" @touchmove.passive="触碰移动" @touchend="触碰结束" @touchcancel="触碰取消" >
            <div class="滑动轨道" :class="{ 拖动中: 滑动状态.拖动中 }" :style="轨道样式" >
                <div class="页" :style="页样式(0)"><SearchPage ref="搜索页" @打开详情="打开详情" /></div>
                <div class="页" :style="页样式(1)"><ResourcesPage /></div>
                <div class="页" :style="页样式(2)"><SettingsPage @打开设置项="打开设置项" /></div>
            </div>
        </div>
        <NavigationBar :当前="滑动状态.当前页" @切换="切到页" />
        <Transition name="遮罩动画" @after-enter="隔离层静态化 = true">
            <div v-if="子页栈.length" class="子页面隔离层" :class="{ 隔离层静态化 }" @touchstart.prevent @touchmove.prevent ></div>
        </Transition>
        <Transition name="子页动画">
            <div v-if="子页栈.length" class="子页层">
                <component :is="子页组件" :key="子页标题" v-bind="子页参数" @返回="关闭子页" />
            </div>
        </Transition>
    </div>
</template>

<script>
import NavigationBar from "./组件/UI/导航栏.android.vue";
import SearchPage from "./组件/页面/搜索.android.vue";
import ResourcesPage from "./组件/页面/资源.android.vue";
import SettingsPage from "./组件/页面/设置.android.vue";
import { 创建滑动, 初始状态 } from "./方法/滑动翻页.android";
import { 查找子页加载器 } from "./方法/设置子页.android";
import { reactive, markRaw } from "vue";

const 页数 = 3;

export default {
    name: "AppAndroid",
    components: { NavigationBar, SearchPage, ResourcesPage, SettingsPage },
    data() {
        return {
            // 状态在这里用 reactive 建好 直接交给模块往里写
            // 不能让模块自己造对象再替换字段 那样闭包指向旧对象 Vue 监听新代理 永远不同步
            // 模板里调 页样式(n) 会读到滑动状态的字段 这次读取被 Vue 追踪 写入即触发重渲染
            滑动状态: reactive(初始状态()),
            // 模块接口 方法是纯函数不参与渲染 放 data 里只为模板能访问
            滑动接口: null,
            // 视口宽高 created 里的取尺寸回调和 mounted 的量视口都要读 必须在 data 里显式声明
            // 否则只是挂在实例上的野字段 模板访问会警告
            // 模块用它们推算视口等大的 .页 尺寸 从而完全不读 DOM
            // clientWidth 的读取会触发强制同步布局
            视口宽: 0,
            视口高: 0,
            // 设置子页的路由栈 push 打开一层 pop 返回一层
            // 元素是 标题 和 组件 组件必须 markRaw
            // 与浏览器 history 一一配对 每次 push 都 pushState 一条 pop 统一在 popstate
            // 这样系统返回键 WebView goBack 和页内返回按钮 history.back 走同一条路 永不错位
            子页栈: [],
            // 页内返回按钮已发出 history.back 但 popstate 还没到的窗口期标记
            // 这个间隙再点返回会发第二个 back 导航进行中被吞 或造成 history 与栈错位 直接忽略
            回退处理中: false,
            // 子页滑到位后为 true 把隔离层的 backdrop-filter 撤掉
            // 那一刻遮罩已被全屏子页完全盖住 撤掉不可见 但省下每帧一次全屏模糊
            // 否则子页内的滚动会一直被背景模糊拖着
            隔离层静态化: false,
        };
    },
    computed: {
        // 栈顶组件和标题 模板与 Transition 只看这两个 栈空时组件为 null
        // 不能把整个栈 computed 给 Transition 用 层的进出动画必须只由栈是否为空驱动
        // 也就是 v-if 子页栈.length 栈内多级切换时不重播层动画
        子页组件() {
            const 顶 = this.子页栈[this.子页栈.length - 1];
            return 顶 ? 顶.组件 : null;
        },
        子页标题() {
            const 顶 = this.子页栈[this.子页栈.length - 1];
            return 顶 ? 顶.标题 : "";
        },
        // 栈顶那层的参数 v-bind 到动态组件上
        // 设置子页不传参数 返空对象 v-bind 空对象无害
        子页参数() {
            const 顶 = this.子页栈[this.子页栈.length - 1];
            return (顶 && 顶.参数) || {};
        },
        // 轨道只依赖 当前页 和 拖动位移 做成 computed 最省
        // computed 的依赖追踪对非响应式的 滑动接口 无效
        // 所以轨道样式内部读的 滑动状态.当前页 和 拖动位移 才是真正依赖来源
        // 这条链路成立的前提是 滑动接口 在首次渲染前已建好 见 created
        轨道样式() {
            return this.滑动接口 ? this.滑动接口.轨道样式() : null;
        },
    },
    created() {
        // created 阶段 el 还不存在 所以取滚动盒要延迟到调用时
        // 用箭头函数捕获 this 每次调用现取 不要在这里就解引用 DOM
        this.滑动接口 = 创建滑动({
            页数,
            状态: this.滑动状态,
            视口宽: () => this.视口宽,
            视口高: () => this.视口高,
            取滚动盒: (索引) => {
                const 页 = this.$el && this.$el.querySelectorAll(".页")[索引];
                return 页 && 页.firstElementChild;
            },
            取页元素: (索引) => {
                return this.$el && this.$el.querySelectorAll(".页")[索引];
            },
        });
    },
    mounted() {
        this.量视口();
        window.addEventListener("resize", this.量视口);
        // 安卓系统返回键 到 Kotlin OnBackPressedCallback 到 WebView goBack 到 popstate
        // 页内返回按钮也统一走 history.back 到 popstate 这里是唯一的 pop 出口
        window.addEventListener("popstate", this.处理返回导航);
    },
    watch: {
        // 切到别的页等于结束搜索 用户规则 切换页面和返回一样结束搜索
        // 面板还开着 请求还在飞的时候翻走 回来会看到过期结果
        // 更糟的是那请求还在偷偷占着站点 5 秒一次的搜索配额
        // 监听 当前页 而不是包装 切到页 手势翻页不经过那个方法
        "滑动状态.当前页"(新页) {
            if (新页 !== 0) this.$refs.搜索页?.结束搜索();
        },
    },
    beforeUnmount() {
        window.removeEventListener("resize", this.量视口);
        window.removeEventListener("popstate", this.处理返回导航);
    },
    methods: {
        // 页样式必须是方法 不是 computed 返回函数
        // computed 只在首次求值时读一次依赖 而它读的是非响应式的 滑动接口 之后永不重算
        // 方法每次渲染都执行 能真正读到滑动状态的字段并建立依赖
        页样式(索引) {
            return this.滑动接口 ? this.滑动接口.页样式(索引) : null;
        },
        量视口() {
            this.视口宽 = (this.$el && this.$el.clientWidth) || window.innerWidth || 360;
            this.视口高 = (this.$el && this.$el.clientHeight) || window.innerHeight || 0;
            // 视口变了 模块里缓存的元素引用和滚动上限要作废 尺寸本身每次现取
            if (this.滑动接口 && this.滑动接口.尺寸失效) this.滑动接口.尺寸失效();
        },
        // 薄包装 模板只写方法名 模块还没建好时静默跳过
        触碰开始(事件) {
            if (this.滑动接口) this.滑动接口.开始(事件);
        },
        触碰移动(事件) {
            if (this.滑动接口) this.滑动接口.移动(事件);
        },
        触碰结束() {
            if (this.滑动接口) this.滑动接口.结束();
        },
        触碰取消() {
            if (this.滑动接口) this.滑动接口.取消();
        },
        切到页(索引) {
            if (this.滑动接口) this.滑动接口.切到(索引);
        },

        // 设置页点某一项 压栈打开对应子页面 栈式路由
        // 找不到就静默忽略 设置列表里有些项本来还没做 账号 语言 问题反馈
        // 报错会刷屏 只留一行 warn 方便排查
        async 打开设置项(标题) {
            const 加载器 = 查找子页加载器(标题);
            if (!加载器) {
                console.warn(`[设置子页] 没有「${标题}」对应的子页面，已忽略`);
                return;
            }
            // 顶层已是同一项 快速连点 不重复压栈
            if (this.子页标题 === 标题) return;
            try {
                const 模块 = await 加载器();
                // 每次新开一层都从带模糊的状态起步 上一层的静态化残留要清掉
                this.隔离层静态化 = false;
                this.子页栈.push({ 标题, 组件: markRaw(模块.default || 模块) });
                // 与栈严格配对 系统返回键会 goBack 到这条记录并触发 popstate
                history.pushState({ 喵小说子页: this.子页栈.length }, "");
            } catch (错误) {
                console.error(`[设置子页] 加载「${标题}」失败`, 错误);
            }
        },
        // 搜索结果点开一本书 打开详情子页
        // 和设置子页走同一套栈加 history 配对 只是组件是固定的
        // 详情页不在 设置项 目录下 所以不走 查找子页加载器 的自动发现
        // 那个约定是给 设置项标题到子页 用的 详情页需要的是带参数打开
        async 打开详情(书) {
            const 目标 = 书?.书;
            if (!目标?.标识) return;
            const 顶 = this.子页栈[this.子页栈.length - 1];
            // 同一本已经开着 不重复压栈 快速连点 换了一本就正常再开一层
            if (顶?.标题 === '书籍详情' && 顶?.参数?.书?.标识 === 目标.标识) return;
            try {
                const 模块 = await import('./组件/子页面/详情.android.vue');
                this.隔离层静态化 = false;
                this.子页栈.push({
                    标题: '书籍详情',
                    组件: markRaw(模块.default || 模块),
                    参数: { 书: 目标, 源: 书.源 || '' },
                });
                history.pushState({ 喵小说子页: this.子页栈.length }, "");
            } catch (错误) {
                console.error('[详情页] 打开失败', 错误);
            }
        },
        // 子页面里 emit 返回 走到这 不直接 pop
        // 而是发 history.back 让 popstate 统一处理
        // 这样栈的 pop 只有一个出口 处理返回导航 history 与栈永不错位
        关闭子页() {
            if (this.回退处理中 || !this.子页栈.length) return;
            this.回退处理中 = true;
            history.back();
        },
        // popstate 系统返回键和页内返回按钮的唯一出口
        // 回退处理中 只负责消费自己刚发出的那次 back pop 逻辑两个来源完全一致
        async 处理返回导航() {
            // 回退处理中 必须等整段处理跑完才清零
            // 下面那个 await 会开出若干毫秒的窗口 期间返回按钮若被点第二次 会发第二次 back
            // 而本条 history 记录已经回退过了 再退一条就多退一层
            // 只有一层子页时会直接退到 App 初始条目 表现为退出应用
            try {
                if (!this.子页栈.length) return;
                // 先把模糊恢复回来 等 DOM 真的刷新完 再 pop 掉栈顶
                // 不能交给 Transition 的 before-leave 钩子里改状态只入队 要等 nextTick 才落盘
                // 而过渡的起点快照是当帧取的 撤不掉
                // 退出动画会从 backdrop-filter none 起步 整个返回过程下层清晰无模糊
                // 且 子页面隔离层.隔离层静态化 优先级高于 遮罩动画-leave-to leave-to 的 blur 0 也压不住
                if (this.隔离层静态化) {
                    this.隔离层静态化 = false;
                    await this.$nextTick();
                }
                this.子页栈.pop();
            } finally {
                this.回退处理中 = false;
            }
        },
    },
};
</script>

<style lang="scss" scoped>
.app-android {
    position: relative;
    height: 100%;
    width: 100%;
    flex: 1 1 auto;
    overflow: hidden;
    background-color: var(--页面底色, #f5f7f9);
    user-select: none;
    -webkit-user-select: none;
}
.核心内容区 {
    position: relative;
    /* 显式占满 .app-android 的剩余空间 它已经是 flex column */
    /* 以前这里没有高度声明 全屏高度是靠三页内容都超过视口被 flex-shrink 压回容器高维持的 */
    /* 实测把三页内容限到 400px 本元素立刻塌成 400px 底栏悬空下方露白 */
    /* flex 1 1 0% 让高度只由父容器决定 与内容多少无关 */
    /* min-height 0 是必需的 flex item 默认 auto 会阻止收缩到内容以下 内容超长反而把高度顶出去 */
    flex: 1 1 0%;
    min-height: 0;
    width: 100%;
    overflow: hidden;
    touch-action: auto;
}
.滑动轨道 {
    display: -webkit-flex;
    display: flex;
    flex-direction: row;
    align-items: stretch;
    width: calc(100% * 3);
    max-width: none;
    height: 100%;
    flex: 0 0 auto;
    transition: transform .5s cubic-bezier(0.22, 0.61, 0.36, 1);
    will-change: transform;
}
.滑动轨道.拖动中 {
    transition: none;
}
.页 {
    position: relative;
    box-sizing: border-box;
    width: calc(100% / 3);
    height: 100%;
    flex: 0 0 calc(100% / 3);
    overflow: hidden;
    transform-origin: center center;
    will-change: transform;
    backface-visibility: hidden;
}

.子页层 {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 20;
    overflow: hidden auto;
    border-radius: 1.5rem;
    background-color: var(--页面底色, #f5f7f9);
    touch-action: auto;
    will-change: transform;
}

/* 滑入 滑出 */
.子页动画-enter-from,.子页动画-leave-to {
    transform: translate3d(100%, 0, 0);
}
.子页动画-enter-active,.子页动画-leave-active {
    transition: transform .5s cubic-bezier(0.22, 0.61, 0.36, 1);
}
.子页面隔离层 {/* 压暗加吃触摸 */
    position: fixed;
    top: 0;          /* 四向归 0 绝不能省 空 div 的 shrink-to-fit 宽高会算成 0 消失 */
    right: 0;
    bottom: 0;
    left: 0;        
    z-index: 15;
    background-color: rgba(0, 0, 0, .0);/* .32 */
    -webkit-backdrop-filter: blur(15px);
    backdrop-filter: blur(15px);
}
.遮罩动画-enter-active,.遮罩动画-leave-active {
    transition: all .5s cubic-bezier(0.22, 0.61, 0.36, 1);
}
.遮罩动画-enter-from,.遮罩动画-leave-to {
    opacity: 0;
    -webkit-backdrop-filter: blur(0px);
    backdrop-filter: blur(0px);
}
.子页面隔离层.隔离层静态化 {
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
}
</style>
