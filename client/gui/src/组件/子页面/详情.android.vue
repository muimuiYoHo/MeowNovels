<template>
    <div class="子页">
        <TitleBar 标题="轻小说详情" @返回="$emit('返回')" />
        <div class="内容区">
            <div class="书籍头">
                <img v-if="封面" :src="封面" :alt="书信息.书名 || ''">
                <img v-else :alt="''">
                <div class="基本信息">
                    <div class="书名">{{ 书信息.书名 || '不知道喵' }}</div>
                    <div class="作者">作者：{{ 书信息.作者 || '不认识喵' }}</div>
                    <div class="标签行">
                        <span v-if="书信息.状态" class="标签 状态" :data-状态="书信息.状态">{{ 书信息.状态 }}</span>
                        <span v-if="书信息.已下架" class="标签 状态 下架" data-状态="已下架">已下架</span>
                        <span v-if="书信息.分类" class="标签">{{ 书信息.分类 }}</span>
                        <span v-if="字数码" class="标签 字数" :class="{ 可切: 可切字数 }" @click="切字数" >{{ 字数码 }} 字</span>
                        <span v-if="分卷目录.length" class="标签">共 {{ 分卷目录.length }} {{ 分卷单位 }}</span>
                    </div>
                </div>
                <div class="操作">
                    <div class="开始" :class="{ 停用: 书信息.已下架 }" @click="开始阅读">{{ 开始文案 }}</div>
                    <div class="收藏" :style='{ "--图标": `url("${图标表.收藏}")` }'></div>
                    <div class="下载" :style='{ "--图标": `url("${图标表.下载}")` }'></div>
                </div>
            </div>

            <div class="简介" v-if="书信息.简介" :data-展开="简介展开 ? 'true' : 'false'" :data-张开="简介张开 ? 'true' : 'false'" @click="切简介" >
                <!-- 高度由 JS 给成显式 px 简介高 px 到 px 的 height 过渡一定会动 auto 只有新内核才插值得动 -->
                <!-- 还没量过 简介高 是 0 时交给 CSS 的折叠高度 -->
                <p :style="简介高 ? { height: 简介高 + 'px' } : null">{{ 书信息.简介 }}</p>
            </div>

            <div class="提示 失败" v-if="错误" @click="拉详情">{{ 错误 }}（点一下重试喵）</div>

            <!-- 下架通知和目录并存 下架不等于没目录 实测 471 有 42 卷 464 章 -->
            <!-- 判据只用源给的 已下架 字段 前端不自己猜 以前拿目录为空推是错的 -->
            <div class="提示 下架" v-if="书信息.已下架">下架了喵╥﹏╥...请先下载再看喵~(小声)</div>
            <div class="提示" v-if="章节加载中">正在取目录喵…</div>
            <div class="提示 失败" v-else-if="章节错误" @click="拉章节">{{ 章节错误 }}（点一下重试喵）</div>
            <div class="提示" v-else-if="!章节.length">这本书没有目录喵</div>

            <!-- 目录按卷折叠 471 有 42 卷 408 话 平铺太长 -->
            <!-- 源给的是扁平章列表 分组在前端的 分卷目录 里做 -->
            <div class="目录" v-if="分卷目录.length">
                <div
                    class="卷"
                    v-for="卷 in 分卷目录"
                    :key="卷.键"
                    :data-展开="展开的卷.includes(卷.键) ? 'true' : 'false'"
                >
                    <!-- 卷头整行可点 下载按钮在里面 必须 click.stop 不然一起触发展开 -->
                    <div class="卷头" @click="切换卷(卷.键)">
                        <div class="卷名">{{ 卷.名称 }}</div>
                        <div class="卷数">{{ 卷.章.length }} 话</div>
                        <!-- 下载只按卷 用户定的 未来不会支持按章 所以按钮只挂卷头右侧 -->
                        <!-- 章条目不设按钮 下载器还没做 点了给一句明确的吐司 不是死按钮 -->
                        <div
                            class="卷下载"
                            :style='{ "--图标": `url("${图标表.下载}")` }'
                            @click.stop="下载卷(卷)"
                        ></div>
                    </div>

                    <!-- 不能用 v-if 展开要真动画就不能让节点凭空出现 -->
                    <!-- grid-template-rows 0fr 到 1fr 的过渡不需要预先知道高度 两个方向都动得起来 -->
                    <!-- 代价是 42 卷的章节点全常驻 DOM 471 共 408 个 收起态高度 0 加 overflow hidden 不占位 -->
                    <div class="章列表">
                        <div class="章列表内">
                            <div
                                class="章"
                                v-for="章 in 卷.章"
                                :key="章.标识"
                                :data-阅读记录="章.阅读记录 || '下次一定'"
                                @click="打开章节(章)"
                            >{{ 章.名称 || '不知道喵' }}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import 图标表 from '../../资源/页面图标';
import TitleBar from '../UI/标题栏.android.vue';
import { 记一次行为, 设置封面 } from '../../方法/历史记录';
import { 获取详情, 获取章节列表, 取回封面 } from '../../方法/源/管理';
// 吐司用原生 安卓吐司 系统 Toast 不依赖 WebView 渲染 白屏卡死也弹得出
// 没有原生桥的环境 PC 浏览器 会自己降级成私有吐司 调用方不用写平台分支
import { 安卓吐司 } from '../../方法/吐司';

// ── 字数 解析和压缩
//
// 站点写法不统一 详情页给 134856字 列表页给 141K
// 先把带单位的字符串还原成数字 再按用户口径压回去
//
// 用户口径 别自己换
//   不满 5 位 小于 10000 原样显示
//   大于等于 1 万 用 w 如 13.5w
//   大于等于 100 万 用 m 如 1.3m
//   保留一位小数 大于等于 1000 时取整 免得 12345.6w 又把标签撑长
//   点标签在压缩值和精确值之间来回切

// 等真正的一帧 rAF 之后还有一次样式和布局 套两层最稳
function 等一帧() {
    return new Promise((完) => requestAnimationFrame(() => requestAnimationFrame(完)));
}

// 一个章属于哪一卷 分组和默认展开哪几卷都走它 规则只能有一处
// 分两处各写一遍迟早会漂移
//
// 优先 卷标识 源给的透传令牌 文库8 是 vid 下载要用它 也最可靠
// 退回 卷名 同名卷会并到一起 可接受的近似
// 都没有就兜底 __全书__ 所有章落一卷 等于源不分组 页面照样能用
function 取卷键(章) {
    const 卷名 = String(章?.卷 ?? 章?.分卷 ?? '').trim();
    return String(章?.卷标识 || '') || 卷名 || '__全书__';
}

// 134856字 / 141K / 13.5万字 到 数字 认不出返 NaN
function 解析字数(文本) {
    const 匹配 = String(文本 ?? '').match(/(\d+(?:\.\d+)?)\s*([kKmMwW万亿]?)/);
    if (!匹配) return NaN;
    const 数 = parseFloat(匹配[1]);
    if (!isFinite(数)) return NaN;
    // 站点给的是大写 K 不归一化就查不到表 静默按 1 倍算 曾把 141K 显示成 141字
    const 单位 = String(匹配[2] || '').toLowerCase();
    const 倍数 = { k: 1e3, w: 1e4, 万: 1e4, m: 1e6, 亿: 1e8 };
    return 数 * (倍数[单位] ?? 1);
}

// 按口径压缩 不满 5 位返空串 交给调用方显示精确值
function 压缩字数(数值) {
    if (!(数值 >= 1e4)) return '';
    const 收 = (值, 单位) => `${值 >= 1000 ? Math.round(值) : Math.round(值 * 10) / 10}${单位}`;
    const 万值 = 数值 / 1e4;
    // 只有四舍五入后仍是 4 位才敢用 w 不然 99999999 会输出 10000w
    // 贴边界的一律改走 m
    if (数值 < 1e8 && Math.round(万值) < 1e4) return 收(万值, 'w');
    // m 是百万 1 亿 到 100m
    return 收(数值 / 1e6, 'm');
}

export default {
    name: 'BookDetail',
    components: { TitleBar },
    props: {
        // 搜索结果那一项原样传进来 标识 书名 作者 分类 状态 简介 封面
        书: {
            type: Object,
            default: () => ({}),
        },
        // 来源标识 写历史用 同一本书不同源是两条记录
        源: { type: String, default: '' },
    },
    data() {
        return {
            图标表,
            // 源返回的完整详情 和搜索项分开存 不往 props 上写
            // props 是父组件的 改它会把列表现场也改掉
            详情: null,
            章节: [],
            // 展开了哪些卷 存卷的键 见 分卷目录
            // 默认全收起 只有整本一卷时才默认展开 就一卷还让点一下太多余
            展开的卷: [],
            章节加载中: false,
            章节错误: '',
            错误: '',
            简介展开: false,
            // 文字是否没被钳位 line-clamp 关掉 和 简介展开 不是一回事
            // 收起动画期间要保持张开 盒缩回 3 行后才重新钳位
            // 否则文字一开始就跳成 3 行 只剩盒子慢慢缩
            简介张开: false,
            // 简介区显式高度 px 0 表示还没量过 交给 CSS 折叠高度
            简介高: 0,
            // 折叠态 3 行 的高度 第一次展开时量出来存着 收起当终点
            简介折叠高: 0,
            // 字数标签是否显示精确值 默认压缩值 点一下切
            字数展开: false,
            // 最终给 img 的地址 先用手上的外站地址立刻显示 取回成功换成 data URL
            封面: '',
            // 历史记录那条的 id 取封面成功后要给它落一张图
            记录id: '',
        };
    },
    computed: {
        // 合并后的书信息 详情优先 列表页的字数简介常常是截断的 详情才准
        // 详情缺的字段由搜索项兜底 两边都不完整 互补最稳
        书信息() {
            return { ...this.书, ...(this.详情 || {}) };
        },
        // 开始阅读的文案 阅读器还没做 现在只会走到 即刻阅读
        开始文案() {
            const 进度 = this.书信息.阅读进度;
            if (进度?.章名) return `从 ${进度.章名} 继续`;
            const 序 = Number(进度?.章序号);
            if (序 > 0) return `从第 ${序} ${this.分卷单位}继续`;
            return '即刻阅读';
        },
        // 章节量词 源可以用 扩展.分卷单位 覆盖 文库8 目录是 卷
        分卷单位() {
            return this.书信息.扩展?.分卷单位 || '话';
        },
        // 把源给的扁平章列表按卷分组 协议 §5 ii 里 卷 和 卷标识 都是可选字段
        //
        // 键优先用 卷标识 源给的透传令牌 文库8 是 vid 下载要用
        // 没有就退回卷名 同名卷并到一起 可接受的近似
        // 都没有全部落进兜底卷 等于不分组 页面照样能用
        // 卷顺序就是首次出现顺序 不用排序 源给的目录本来就是书里的顺序
        分卷目录() {
            const 卷表 = [];
            const 索引 = new Map();
            for (const 章 of this.章节) {
                const 键 = 取卷键(章);
                let 卷 = 索引.get(键);
                if (!卷) {
                    卷 = {
                        键,
                        名称: String(章?.卷 ?? 章?.分卷 ?? '').trim() || '目录',
                        标识: String(章?.卷标识 || ''),
                        章: [],
                    };
                    索引.set(键, 卷);
                    卷表.push(卷);
                }
                卷.章.push(章);
            }
            return 卷表;
        },
        // 字数标签
        // 不满 5 位 永远精确值 没什么可压的 也不可点
        // 满 5 位 默认 13.5w 或 1.3m 点一下换精确值 再点回去
        字数码() {
            const 数值 = 解析字数(this.书信息.字数);
            if (!isFinite(数值) || 数值 <= 0) return '';
            if (this.字数展开) return `${数值}`;
            return 压缩字数(数值) || `${数值}`;
        },
        // 只有压得动的字数才可点 不满 1 万点了也没变化 别给假交互
        可切字数() {
            return 解析字数(this.书信息.字数) >= 1e4;
        },
    },
    async mounted() {
        this.初始化();
    },
    watch: {
        // App 渲染子页用 :key="子页标题" 而每本书的详情页标题都是 书籍详情
        // 换一本书 Vue 会复用同一个实例 mounted 不重跑
        // 不盯住标识 屏幕上会是旧书的详情和目录加新书的书名
        '书.标识'(新值, 旧值) {
            if (新值 && 新值 !== 旧值) this.初始化();
        },
    },
    methods: {
        // 打开或换一本书时的全套初始化
        async 初始化() {
            // 复用实例时这些字段还留着上一本的值 先全部复位
            this.详情 = null;
            this.章节 = [];
            this.展开的卷 = [];
            this.章节错误 = '';
            this.错误 = '';
            this.简介展开 = false;
            this.简介张开 = false;
            this.简介高 = 0;
            this.简介折叠高 = 0;
            this.字数展开 = false;
            this.记录id = '';
            // 手上已经有本地图 历史记录落盘那张 就先亮出来 别等网络
            this.封面 = String(this.书.封面 || '').startsWith('data:') ? this.书.封面 : '';

            // 打开详情就是浏览 它升级既有记录 搜索 到 浏览 到 下载 不新增一条
            try {
                const 记录 = await 记一次行为('浏览', {
                    标题: this.书.书名 || '',
                    源: this.源 || undefined,
                    资源标识: this.书.标识 || undefined,
                });
                this.记录id = 记录?.id || '';
            } catch {
                // 记历史失败不影响看详情
            }

            // 详情和目录同时发起 一条是 book 一条是 packshow 互不依赖
            // 真正串行由网络层闸门负责 隐藏 WebView 同时只能取一页
            // 并发发出去不会串台 但也快不了
            this.拉详情();
            this.拉章节();
        },

        // 字数标签的点击 在压缩值和精确值之间切
        切字数() {
            if (this.可切字数) this.字数展开 = !this.字数展开;
        },

        // 简介展开和收起
        //
        // 高度两个方向都用显式 px height auto 只有新内核插值得动 实测展开会动收起一下跳过去
        // 展开前先量出自然高度 收起用当前真实高度 两头都是 px 一定过渡
        //
        // display 的变化必须和改高度隔一次样式变化
        // 折叠态要 -webkit-box 才有省略号 展开态要 block 才好排版 换盒会重建布局盒
        // 浏览器会顺手把同一次变化里的 height 过渡取消 现象就是展开变硬切换
        // 顺序是先解钳位 等一帧 再改高度
        //
        // 收起期间不解钳位 一开钳位文字立刻变 3 行 盒子还在慢慢缩
        // 等动画走完 留到 320ms 再钳 那时高度正好 3 行 钳上不跳
        async 切简介() {
            const p = this.$el?.querySelector('.简介 p');
            if (!p) {
                this.简介展开 = !this.简介展开;
                return;
            }

            if (!this.简介展开) {
                // ── 展开
                if (!this.简介折叠高) this.简介折叠高 = p.offsetHeight; // 此刻还折叠着 等于 3 行高
                const 自然高 = this.量自然高(p);
                this.简介展开 = true;                        // 标签先变收起
                this.简介高 = this.简介折叠高 || 自然高;      // 起点 px 此刻高度不变
                this.简介张开 = true;                        // 解钳位 display 会变
                await 等一帧();                              // 让换盒单独成为一次样式变化
                this.简介高 = 自然高;                        // 终点 px 过渡从 3 行到全文
                return;
            }

            // ── 收起
            this.简介高 = p.offsetHeight; // 起点 px 展开态的真实高度
            this.简介展开 = false;         // 标签变展开
            await 等一帧();
            this.简介高 = this.简介折叠高 || p.offsetHeight; // 终点 px 3 行高
            setTimeout(() => {
                // 动画走完再钳位 期间又展开了就别管
                if (!this.简介展开) this.简介张开 = false;
            }, 320);
        },

        // 量出简介不限行时的自然高度
        // 同一帧里 解钳位 量 还原 中间不给浏览器绘制机会 不会闪
        // 折叠态下 p 被 line-clamp 钳到 3 行 scrollHeight 也只有 3 行 量不到全文
        量自然高(p) {
            const 旧显示 = p.style.display;
            const 旧钳位 = p.style.webkitLineClamp;
            const 旧高 = p.style.height;
            p.style.display = 'block';
            p.style.webkitLineClamp = 'unset';
            p.style.height = 'auto';
            const 高 = p.getBoundingClientRect().height;
            p.style.display = 旧显示;
            p.style.webkitLineClamp = 旧钳位;
            p.style.height = 旧高;
            return 高;
        },
        // 拉书籍详情 失败走页内提示 可点重试 不弹窗打扰
        async 拉详情() {
            if (!this.书.标识) {
                this.错误 = '这条记录没有书标识喵';
                return;
            }
            this.错误 = '';
            let 结果;
            try {
                结果 = await 获取详情(this.书.标识, { 标识: this.源 || undefined });
            } catch (错误) {
                // 必须自己兜住 mounted 里没 await 这个 promise
                // 抛出去就是一条无人接管的 rejection 页面只会静静什么都不显示
                this.错误 = String(错误?.message ?? 错误);
                return;
            }
            if (!结果.成功) {
                this.错误 = 结果.错误;
                return;
            }
            // 空壳详情等于失败 书名都没有 几乎一定是挑战页或异常页
            // 当数据渲染出来就是未知书名佚名那类脏数据 搜索页已经踩过一次
            if (!结果.详情?.书名 || 结果.详情.书名 === '未知') {
                this.错误 = '站点没有返回详情页（多半是人机验证没过）—— 换个网络或稍后再试';
                return;
            }
            this.详情 = 结果.详情;

            // 封面先定一个能立刻显示的地址 再去源里取真图
            // 外站地址可能防盗链裂图 取回后是 data URL 断网也能显示 三级优先
            //   本地图最快且离线可用 到 详情页地址 到 搜索列表地址
            const 本地 = String(this.书.封面 || '').startsWith('data:') ? this.书.封面 : '';
            const 地址 = 本地 || 结果.详情.封面 || this.书.封面 || '';
            if (!地址) return;
            this.封面 = 地址;
            // 已经是本地图就没必要再取一次 同一条记录重复打开省一个往返
            if (!地址.startsWith('data:')) this.取封面(地址);
        },

        // 拉目录 文库8 给的是分卷 它只有分卷打包下载
        async 拉章节() {
            if (!this.书.标识) return;
            this.章节加载中 = true;
            this.章节错误 = '';
            try {
                const 结果 = await 获取章节列表(this.书.标识, { 标识: this.源 || undefined });
                if (!结果.成功) {
                    this.章节错误 = 结果.错误;
                    return;
                }
                this.章节 = 结果.章节;
                // 默认展开 整本一卷 含源不给卷全落兜底卷那种 就展开 多卷一律收起
                // 42 卷的书全展开等于没折叠
                // 这里不走 分卷目录 computed 刚赋值缓存还没刷新 依赖它要 await nextTick
                // 按同一规则同步算
                const 卷键集 = new Set(结果.章节.map(取卷键));
                this.展开的卷 = 卷键集.size <= 1 ? [...卷键集] : [];
            } catch (错误) {
                // 同上 抛出去没人接 页面会静默空着
                // 桥在并行请求下串台导致源里 null.split 就是这么被藏了一个来回
                this.章节错误 = String(错误?.message ?? 错误);
            } finally {
                this.章节加载中 = false;
            }
        },

        // 取回封面 协议 §5.1 源只报地址 下载和转码由工具层做
        // 失败不报错 留着外站地址照样能显示 只是断网会裂图
        async 取封面(地址) {
            const 结果 = await 取回封面(地址, { 标识: this.源 || undefined });
            if (!结果.成功) {
                console.warn('[详情页] 取回封面失败：', 结果.错误);
                return;
            }
            this.封面 = 结果.地址;
            // 选精确结果到下载封面那条链在这里闭合
            // 记录里不存封面字段 只落一个和记录 id 同名的图片文件
            // 命中封面缓存就别再写一遍盘 第一次取回时同一张图已经落过
            if (this.记录id && !结果.来自缓存) {
                try {
                    await 设置封面(this.记录id, 结果.纯base64, 结果.后缀);
                } catch {
                    // 封面落盘失败不影响看详情
                }
            }
        },

        // 展开或收起一个卷 点卷头触发
        切换卷(键) {
            const 位 = this.展开的卷.indexOf(键);
            if (位 >= 0) this.展开的卷.splice(位, 1);
            else this.展开的卷.push(键);
        },

        // 卷头右侧那个下载按钮
        // 下载只按卷 用户定的 未来不会支持按章 所以它是卷级入口
        // 收下整个 名称 标识 vid 章 下载器接上后直接吃这个结构
        // 下架的书下载同样没意义 站点不再提供在线阅读与下载服务 先拦一句
        下载卷(卷) {
            if (this.书信息.已下架) {
                安卓吐司('这本书下架了喵，站点不再提供下载╥﹏╥');
                return;
            }
            安卓吐司(`「${卷.名称}」（${卷.章.length} 话）的下载器还在做喵`);
        },

        // 点目录一条 阅读
        // 下架的书只限制在前端 源照常给目录 471 有 42 卷 464 章
        // 站点却不再提供在线阅读与下载服务 点进去必然取不到正文 先拦一句
        打开章节(章) {
            if (this.书信息.已下架) {
                安卓吐司('这本书下架了喵，站点不再提供在线阅读╥﹏╥');
                return;
            }
            安卓吐司(`「${章?.名称 || '这一节'}」的阅读器还在做喵`);
        },

        // 即刻阅读 从第一章开始 阅读器接上后改走同一入口
        开始阅读() {
            if (this.书信息.已下架) {
                安卓吐司('先下载喵才能给你看喵~');
                return;
            }
            const 第一章 = this.章节[0];
            if (!第一章) {
                安卓吐司('目录还没取到喵');
                return;
            }
            安卓吐司(`阅读器还在做喵（会从「${第一章.名称 || '第一' + this.分卷单位}」开始）`);
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
        overflow: hidden auto;
        /* 三个都必须有 目录长了要能滚 */
        /* flex 1 1 auto 让滚动盒拿到 子页高度减标题栏 的确定高度 */
        /* 少了它盒子按内容撑高 超出部分被裁掉 整页滚不动 */
        /* min-height 0 是 flex 子项老规矩 默认 auto 会拒绝收缩 */
        flex: 1 1 auto;
        min-height: 0;
        width: 100%;
        gap: 15px;
        padding: max(30px, calc(env(safe-area-inset-top, 10px) + 3rem + 15px)) 0
            max(15px, env(safe-area-inset-bottom, 0) * 1.5);
        > * {
            flex-shrink: 0;
        }
    }
    .书籍头 {
        position: relative;
        display: flex;
        gap: 15px;
        align-items: flex-start;
        img {
            width: 38.2%;
            aspect-ratio: 1/1.45;
            border-radius: 1rem;
            object-fit: cover;
            object-position: center;
            background-color: var(--蓝灰);
            flex-shrink: 0;
        }
        .基本信息 {
            display: flex;
            flex-direction: column;
            gap: 5px;
            min-width: 0;
            flex: 1;
            align-self: flex-start;
            .书名 {
                font-size: 1.2rem;
                font-weight: 600;
                color: var(--文本主色);
                line-height: 1.3;
            }
            .作者 {
                font-size: .9rem;
                color: var(--文本次色);
            }
            .标签行 {
                display: flex;
                flex-wrap: wrap;
                white-space: nowrap;
                gap: 6px;
                .标签 {
                    font-size: .75rem;
                    padding: .15rem .5rem;
                    border-radius: 1rem;
                    color: var(--文本次色);
                    background-color: color-mix(in srgb, var(--蓝灰) 10%, transparent);
                    &.下架 {
                        color: var(--资源状态-已下架);
                        background-color: color-mix(in srgb, var(--资源状态-已下架) 10%, transparent);
                    }
                }
                .状态 {
                    &[data-状态="已完结"] { color: var(--资源状态-已完结); background-color: color-mix(in srgb, var(--资源状态-已完结) 10%, transparent);}
                    &[data-状态="连载中"] { color: var(--资源状态-连载中); background-color: color-mix(in srgb, var(--资源状态-连载中) 10%, transparent);}
                    &[data-状态="已下架"] { color: var(--资源状态-已下架); background-color: color-mix(in srgb, var(--资源状态-已下架) 10%, transparent);}
                }
                .字数 {
                    /* 安卓点击蓝框闪烁 */
                    -webkit-tap-highlight-color: transparent;
                    /* 压得动 满 1 万 才可点 虚下划线是点一下看精确值的提示 */
                    &.可切 {
                        text-decoration: underline dotted;
                        text-underline-offset: 3px;
                    }
                }
            }
        }
        .操作 {
            position: absolute;
            right: 0;
            bottom: 0;
            height: 2.5rem;
            width: calc(61.8% - 15px);
            display: flex;
            align-items: center;
            gap: 10px;
            > * {
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .开始 {
                height: 100%;
                flex-grow: 1;
                border-radius: 1.5rem;
                color: var(--控件文本);
                background-color: var(--主题色);
                /* 已下架就压暗 点了会给一句解释 不是死按钮 */
                &.停用 {
                    background-color: var(--中性-300);
                    color: var(--文本次色);
                }
            }
            .收藏, .下载 {
                height: 80%;
                aspect-ratio: 1;
                border-radius: 1.5rem;
                mask: var(--图标) center / contain no-repeat;
                -webkit-mask: var(--图标) center / contain no-repeat;
            }
            .收藏 {
                border: var(--小米橙) 1.5px solid;
                background-color: var(--小米橙);
            }
            .下载 {
                border: 1.5px solid var(--下载);
                background-color: var(--下载);
            }
        }
    }
    .简介 {
        position: relative;
        margin-top: 1rem;
        &::before {
            position: absolute;
            content: '简介 · 展开';
            left: 1rem;
            top: -1.2rem;
            padding: 0 3px;
            font-size: .9rem;
            font-weight: 600;
            color: color-mix(in srgb, var(--简介提示) 70%, transparent);
            background-color: var(--页面背景);
            z-index: 1;
        }
        &[data-展开="true"]::before { content: '简介 · 收起'; }
        &::after {
            position: absolute;
            content: '';
            height: calc(100% + .5rem);
            width: calc(100% - 5px);
            left: 50%;
            top: 50%;
            transform: translate(-50%,calc(-50% - .15rem));
            border: var(--简介边框) 1.5px solid;
            border-radius: 1rem;
        }
        p {
            padding: 0 10px 0;
            font-size: .9rem;
            line-height: 1.5;
            color: var(--简介文本);
            text-overflow: ellipsis;
            overflow: hidden;
            /* 折叠等于 3 行加省略号 4.05rem 等于 .9rem 乘 1.5 乘 3 和 line-clamp 正好齐平 */
            /* 这只是默认或未量过时的高度 点过展开就由 JS 给显式 px 两个方向都是 px 到 px 过渡一定生效 */
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 3;
            height: 4.05rem;
            transition: height .3s ease;
        }
        /* 张开等于不钳位 看 data-张开 而不是 data-展开 */
        /* 收起动画期间仍算张开 否则文字一开始就跳成 3 行 只剩盒子在慢慢缩 */
        &[data-张开="true"] p {
            display: block;
            -webkit-line-clamp: unset;
        }
    }
    .提示 {
        font-size: .85rem;
        color: var(--文本次色);
        text-align: center;
        padding: .3rem 0;
        &.失败 {
            color: var(--红);
        }
        &.下架 {
            color: var(--主题色);
        }
    }
    .目录 {
        /* 不能给 margin-top auto 会把目录顶到内容区最底部 短目录中间空一大片 */
        /* 目录紧跟着简介往下排 剩下的空白留在页面最下方 */
        display: flex;
        flex-direction: column;
        gap: 10px;
        .卷 {
            border-radius: 1rem;
            border: var(--章节卷边框) 1px solid;
            background-color: var(--内容卡片);
            /* 展开时章列表贴着圆角裁 不然直角会顶出卡片 */
            overflow: hidden;
            .卷头 {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 0 15px;
                min-height: 3rem;
                font-size: 1rem;
                /* 安卓点击蓝框闪烁 */
                -webkit-tap-highlight-color: transparent;
                /* 展开指示用纯 CSS 三角 图标表里没有展开箭头 画一个更省事 */
                /* 这里的 before 是参与 flex 排版的第一个盒子 要给 flex-shrink 0 否则窄屏被压成一条线 */
                &::before {
                    content: '';
                    flex-shrink: 0;
                    width: 0;
                    height: 0;
                    border-left: 6px solid var(--文本次色);
                    border-top: 4.5px solid transparent;
                    border-bottom: 4.5px solid transparent;
                    transition: transform .2s ease;
                }
                .卷名 {
                    flex: 1;
                    min-width: 0;
                    overflow: hidden;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                    color: var(--文本主色);
                }
                .卷数 {
                    font-size: .8rem;
                    color: var(--文本次色);
                    white-space: nowrap;
                }
                .卷下载 {
                    height: 1.6rem;
                    aspect-ratio: 1;
                    flex-shrink: 0;
                    -webkit-tap-highlight-color: transparent;
                    background-color: var(--下载);
                    mask: var(--图标) center / contain no-repeat;
                    -webkit-mask: var(--图标) center / contain no-repeat;
                }
            }
            &[data-展开="true"] .卷头::before {
                transform: rotate(90deg);
            }
            .章列表 {
                display: grid;
                grid-template-rows: 0fr;
                transition: grid-template-rows .26s ease;
                .章列表内 {
                    min-height: 0;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }
                .章 {
                    padding: .65rem 15px .65rem 34px;
                    font-size: .9rem;
                    line-height: 1.4;
                    border-top: 1px solid var(--章节卷边框);
                    -webkit-tap-highlight-color: transparent;
                    /* 长章名一行截断 目录条目多 不折行更整齐 */
                    overflow: hidden;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                    &[data-阅读记录="看完了"] { color: var(--文本淡色); }
                    &[data-阅读记录="正在看"] { color: var(--主题色); }
                    &[data-阅读记录="下次一定"] { color: var(--文本主色); }
                }
            }
            &[data-展开="true"] .章列表 {
                grid-template-rows: 1fr;
            }
        }
    }
}
</style>
