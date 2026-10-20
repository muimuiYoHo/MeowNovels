<template>
    <div class="搜索页" :class="{ 面板展开: 展开 }" @click="处理背景点击">
        <div class="搜索隔离层" :class="{ 显示: 展开 }" @click.stop="收起" @touchstart.stop.prevent @touchmove.stop.prevent ></div>

        <div class="搜索区" :class="{ 打开关联面板, 展开 }" data-欢迎语="今天看点什么喵~">
            <div class="搜索框">
                <input ref="输入区" :value="关键词" type="text" class="输入区" @input="处理输入" @focus="聚焦输入" @keydown.enter="展开面板()" />
                <div class="清空输入" :class="{ 显示清空: 关键词.length > 0 }" :style='{ "--图标": `url("${图标表.关闭_小}")` }' @click.stop="清空输入内容" ></div>
                <button class="go搜索" aria-label="展开面板" :style='{ "--图标": `url("${图标表.搜索}")` }' @click.stop="展开面板()" ></button>
            </div>

            <div class="关联面板" @scroll="面板滚动">
                <div v-for="(项, 索引) in 搜索结果" :key="项.标识 || 索引" class="结果项" :class="{ 预搜索: !展开 }" @click.stop="点结果(项)" >
                    <template v-if="展开">
                        <img v-if="项.封面" :src="项.封面" :alt="''">
                        <img v-else :alt="''">
                    </template>
                    <div class="结果信息">
                        <div class="书名">{{ 项.书名 || '不知道喵' }}</div>
                        <div class="作者">{{ 项.作者 || '不认识喵' }}</div>
                        <div class="更新至">{{ 更新文案(项) }} 更新</div>
                    </div>
                    <div class="结果状态" v-if="展开 && 项.状态" :data-状态="项.状态">{{ 项.状态 }}</div>
                </div>
                <div class="提示行" v-if="提示文字" :data-状态="提示文字">{{ 提示文字 }}</div>
            </div>
        </div>

        <div class="历史记录区">
            <div v-for="(分组, 索引) in 历史分组" :key="分组.时间" class="分组" :class="{ '分组-收回': 分组.收回 }" >
                <div class="分组框架" @click="切换分组(索引)">
                    <div class="图标-箭头">
                        <svg height="20px" viewBox="0 -960 960 960" width="48px" fill="currentColor">
                            <path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z"/>
                        </svg>
                    </div>
                    <div class="时间">{{ 分组.时间 }}</div>
                    <div class="分割线"></div>
                </div>
                <div class="分组内容">
                    <div v-for="(会话, 会话索引) in 分组.会话列表" :key="会话索引" class="会话" :data-行为="会话.行为" @click.stop="点击会话(会话)" >
                        <img v-if="会话.封面地址" :src="会话.封面地址" :alt="会话.标题">
                        <div class="会话信息">
                            <div>{{ 会话.标题 }}</div>
                            <div>{{ 会话.时间 }}</div>
                        </div>
                        <div class="会话行为" :data-行为="会话.行为">{{ 会话.行为 }}</div>
                    </div>
                </div>
            </div>
            <div class="没更多力"><!-- 到头了喵 --></div>
        </div>
    </div>
</template>

<script>
import 图标表 from '../../资源/页面图标';
import { markRaw } from 'vue';
import { 读取分组, 记一次行为 } from '../../方法/历史记录';
import { 搜索, 取当前源 } from '../../方法/源/管理';
import { 过挑战 } from '../../方法/网络';

// 输入就搜的防抖 别调短 文库8 搜索硬限速 5 到 6 秒 敲一个字发一次全得失败
const 防抖毫秒 = 500;
// 首屏一次要几页 一页 20 条
// 别调大 自动连发就是爬虫特征 实测连发 7 次就被 CF 打进挑战 要等 5 到 7 分钟
const 首次加载页数 = 2;
// 第 1 页和第 2 页之间的间隔 必须留 0.5 秒内连发两次就 403
const 首次加载间隔毫秒 = 2500;
// 结果缓存份数 不过期 只按容量淘汰 满了丢最老的 命中就挪到最新
const 缓存份数 = 12;
// 0 条或站点稍后再试 等这么久再重试 文库8 搜索窗口 6 秒 短了白试
const 重试等待秒 = 5;
// 最多首次加 2 次重试 每次之间等 6 秒 再长用户以为卡死
const 重试次数上限 = 2;

// 这个失败值不值得重试 过会再来就好的才重试 源配置错重试一万次也一样
const 可重试失败 = (说) => {
    const 文 = String(说 ?? '');
    if (/域名集|元信息|没有实现/.test(文)) return false; // 永久错 重试没意义
    return /稍后再试|E-NET|请求失败|超时|网络/.test(文);
};

// 2026-10-05 到今天是几天 按本地日历日算 解析不了或未来日期返 null
function 相对天数(文本) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(文本 ?? '').trim());
    if (!m) return null;
    const 目标 = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const 今天 = new Date();
    今天.setHours(0, 0, 0, 0);
    const 天 = Math.round((今天 - 目标) / 86400000);
    return 天 < 0 ? null : 天;
}

export default {
    name: '搜索Android',
    data() {
        return {
            图标表,
            关键词: '',
            打开关联面板: false,
            // 这里以前有个 收起 false 的残留字段 跟 methods 的 收起 同名
            // data 会盖住方法 this.收起() 直接 is not a function 整条收起链路静默失效
            // 加 data 字段前先看有没有同名方法
            历史分组: [],
            搜索结果: [],
            搜索中: false,
            搜索错误: '',
            展开: false,
            // 等站点重试的倒计时 单独一个字段 那期间没在搜 文案不一样
            等待提示: '',
            // 这次结果来自哪个源 同一本书不同源是两条记录
            当前源标识: '',
            // 内部状态 放 data 才能跨方法共享
            防抖计时器: null,
            搜索序号: 0,
            上次搜索过的词: '',
            结果缓存: markRaw(new Map()),
            // 分页按需加载 页数要跟结果一起进缓存 不然命中的不完整结果没法往下接
            当前页: 1,
            搜索总页数: 1,
            加载下一页中: false,
            // 展开前滚到哪 展开锁滚动会把 scrollTop 钳成 0 收起要回原位
            展开前滚动: 0,
            // 在飞那次搜索的中止器 打断不是不显示 是根本别再发
            中断控制器: null,
        };
    },
    watch: {
        // 展开是全屏浮层 必须整页锁滚动
        // 面板滚到底继续拖 滚动链传给搜索页 背后的历史记录跟着动 就是穿帮
        展开(新值) {
            const 页 = this.$el;
            if (!页) return;
            if (新值) {
                this.展开前滚动 = 页.scrollTop || 0;
                return;
            }
            const 回位 = this.展开前滚动 || 0;
            if (!回位) return;
            // 不能只在 nextTick 里设 收起时搜索区还在过渡 内容没长回来 最大滚动是 0 赋值会被钳成 0
            // 等过渡结束再补一次
            this.$nextTick(() => {
                页.scrollTop = 回位;
            });
            setTimeout(() => {
                if (!this.展开) 页.scrollTop = 回位;
            }, 360);
        },
    },
    computed: {
        提示文字() {
            if (this.等待提示) return this.等待提示;
            if (this.搜索错误) return this.搜索错误;
            if (this.搜索中) return '正在努力找喵！';
            // 只在真还有下一页时才挂这句 到底了还挂着用户只会干等
            if (this.加载下一页中 && this.当前页 < this.搜索总页数) return '正在找更多喵…';
            if (this.上次搜索过的词 && !this.搜索结果.length) return '没找到这本书喵';
            // 翻过页且到底 给个终结感 首屏只有 1 页时不说
            if (this.当前页 > 1 && this.当前页 >= this.搜索总页数) return '没有更多了喵';
            return '';
        },
    },
    async mounted() {
        this.历史分组 = await 读取分组();
        // 后台预热 冷启动第一次搜索要整页加载建 origin 约 3 秒 预热后走同源 fetch 约 0.6 秒
        // 不 await 失败也不影响正事
        this.预热();
    },
    beforeUnmount() {
        // 定时器不清理 切页卸载后还会打一次无用请求
        if (this.防抖计时器) clearTimeout(this.防抖计时器);
    },
    methods: {
        // 借隐藏 WebView 访问一次源主站 把 origin 和 CF 通行证备好
        // 只占首页请求 不占搜索限速配额 失败静默
        async 预热() {
            try {
                const 会话 = await 取当前源();
                const 域名 = 会话?.元信息?.域名集?.[0];
                if (域名) await 过挑战(`https://${域名}/`);
            } catch {
                /* 预热失败无妨 */
            }
        },

        处理输入(事件) {
            this.关键词 = 事件.target.value;
            const 词 = this.关键词.trim();
            if (!词) {
                // 清空了面板关掉 顺带打断在飞的搜索
                this.搜索结果 = [];
                this.搜索错误 = '';
                this.收起();
                return;
            }
            this.打开关联面板 = true;
            // 词没变 重复输入或方向键 什么都不用做
            if (词 === this.上次搜索过的词 && this.搜索结果.length) return;

            // 缓存命中直接显示 连防抖都不等 没请求要发 白等 0.8 秒是加戏
            const 命中 = this.结果缓存.get(词);
            if (命中) {
                this.打断搜索();        // 顺带清在飞那次和排定的防抖
                this.记缓存(词, 命中);   // 命中也要挪到最新
                // 必须取 结果 缓存条目是 结果 页 总页数
                // 整个对象塞进去 v-for 会遍历 3 个键 显示 3 条未知书名 而且 length 是 undefined
                this.搜索结果 = 命中.结果;
                this.当前页 = 命中.页 ?? 1;
                this.搜索总页数 = 命中.总页数 ?? 1;
                this.上次搜索过的词 = 词;
                this.搜索错误 = '';
                this.搜索中 = false;
                this.等待提示 = '';
                return;
            }

            // 未命中立刻清上一次的显示 并作废在飞那次 旧词回来会盖新词
            if (词 !== this.上次搜索过的词) {
                this.搜索结果 = [];
                this.搜索错误 = '';
                this.上次搜索过的词 = '';
            }
            this.打断搜索();          // 里面会把搜索中置 false 所以下面要重新点亮
            this.搜索中 = true;       // 防抖窗口里也要有在搜的样子
            this.排定搜索();
        },
        聚焦输入() {
            if (this.关键词.trim()) this.打开关联面板 = true;
        },
        清空输入内容() {
            this.关键词 = '';
            this.搜索结果 = [];
            this.搜索错误 = '';
            this.收起(); // 顺带打断在飞的搜索 清空了就不该再出结果
            this.$refs.输入区?.focus();
        },

        // ── 搜索 ──
        排定搜索() {
            if (this.防抖计时器) clearTimeout(this.防抖计时器);
            this.防抖计时器 = setTimeout(() => {
                this.防抖计时器 = null;
                this.去搜索(this.关键词);
            }, 防抖毫秒);
        },
        // 真去查一次 任何路径都先查缓存 文库8 搜索 5 到 6 秒硬限速 重复请求纯亏
        async 去搜索(词, 选项 = {}) {
            const 关键词 = String(词 ?? '').trim();
            if (!关键词) return;

            // 已有这个词的结果 直接复用
            // 缓存存的是 结果 页 总页数 不是裸数组 页数必须一起存
            // 分页按需加载 只滚到第 2 页就走的话缓存是不完整的 40 条
            // 连进度一起记住 下次命中还能接着要第 3 页
            const 缓存命中 = this.结果缓存.get(关键词);
            if (缓存命中) {
                // 命中也要挪到最新 不然常用词一直待队首 被后面的新词当最老的淘汰
                this.记缓存(关键词, 缓存命中);
                this.搜索结果 = 缓存命中.结果;
                this.当前页 = 缓存命中.页 ?? 1;
                this.搜索总页数 = 缓存命中.总页数 ?? 1;
                this.上次搜索过的词 = 关键词;
                this.搜索错误 = '';
                this.搜索中 = false;
                this.等待提示 = '';
                // 缓存命中也要复位 不然上次遗留的正在找更多会一直挂着
                this.加载下一页中 = false;
                return;
            }
            // 同词在飞别插队 这道闸门必须同时看 中断控制器
            // 防抖窗口里搜索中已经置 true 那时没有请求在飞 中文输入法常同词再触发一次 input
            // 只判搜索中 那次重敲会在这里 return 搜索中永远停 true
            // 提示行永久挂着 而且这次搜索根本没发出去
            if (this.搜索中 && 关键词 === this.上次搜索过的词 && this.中断控制器) return;
            // 我从海底出击
            const 序号 = ++this.搜索序号;
            this.搜索中 = true;
            this.搜索错误 = '';
            this.等待提示 = '';
            this.上次搜索过的词 = 关键词;
            this.当前页 = 1;
            this.搜索总页数 = 1;
            // 必须在这里清掉加载下一页中
            // 加载下一页的 finally 是序号相等才清 换词后序号对不上 标志永远不清
            // 提示永久停在正在找更多 而且加载下一页开头直接 return 之后再也翻不了页
            // 缓存命中那条路同样要清
            this.加载下一页中 = false;

            // 停掉上一次还在跑的 换词 切页 收起都可能留下一条在飞
            this.中断控制器?.abort();
            const 控制器 = new AbortController();
            this.中断控制器 = 控制器;

            try {
                // 首屏直接要 2 页 之后等用户往下滚再要 一次点击最多 2 个请求 像人翻了一页
                // 自动翻完全部页是每 5 秒连发 7 个 爬虫特征 会被 CF 403 连首页都拦
                //
                // 可重试的失败自动重试 0 条也走这条 文库8 被限速会返空结果页 等一个窗口再来
                let 结果 = null;
                for (let 次 = 0; 次 <= 重试次数上限; 次++) {
                    if (次 > 0) {
                        // 重试前把在搜的态让给倒计时 文案不一样用户才知道是在等
                        this.搜索中 = false;
                        const 继续 = await this.倒计时重试(序号, '别急喵，可能是站点累了喵');
                        if (!继续) return; // 期间换词 收起 切页 立刻撤
                        this.搜索中 = true;
                    }
                    结果 = await 搜索(关键词, {
                        ...(次 > 0 ? { 跳过自动登录: true, 已重试: true } : {}),
                        信号: 控制器.signal,
                        页: 1,
                    });
                    if (序号 !== this.搜索序号) return; // 废案
                    if (结果.成功 && 结果.结果.length) break; // 拿到东西了
                    if (次 >= 重试次数上限) break;             // 重试用尽
                    // 0 条多半是限速给的空页 值得重试 真失败只有过会再来那类才重试
                    if (!结果.成功 && !可重试失败(结果.错误)) break;
                }

                if (!结果?.成功) {
                    // 已有结果显示着就别清掉 只提示错误 清了用户以为全失败
                    this.搜索错误 = 结果?.错误 || '搜索失败';
                    return;
                }

                // 第 1 页先摆出来 后面那页到了再追加
                this.搜索结果 = 结果.结果;
                this.当前源标识 = 结果.元信息?.标识 || '';
                this.当前页 = 结果.页 ?? 1;
                this.搜索总页数 = Math.max(结果.总页数 ?? 1, 1);

                // 补到首屏应有页数 页与页之间留间隔
                while (this.当前页 < 首次加载页数 && this.当前页 < this.搜索总页数) {
                    await new Promise((完成) => setTimeout(完成, 首次加载间隔毫秒));
                    if (序号 !== this.搜索序号) return; // 等待期间换词了 停
                    const 下页 = await 搜索(关键词, { 信号: 控制器.signal, 页: this.当前页 + 1 });
                    if (序号 !== this.搜索序号) return;
                    if (!下页.成功) break; // 第二页挂了别把第一页也毁掉 也不报错
                    this.当前页 = 下页.页 ?? this.当前页 + 1;
                    this.搜索总页数 = 下页.总页数 || this.搜索总页数;
                    this.搜索结果 = [...this.搜索结果, ...下页.结果];
                }

                // 缓存连进度一起存 只滚到一半就走的下次还能接着滚
                this.记缓存(关键词, {
                    结果: this.搜索结果,
                    页: this.当前页,
                    总页数: this.搜索总页数,
                });
            } finally {
                // 兜底 成功失败抛异常都一样 只要还是我这一次 就把在搜和倒计时清掉
                // 绝不能让提示行永久挂住
                if (序号 === this.搜索序号) {
                    this.搜索中 = false;
                    this.等待提示 = '';
                }
            }
        },

        // 重试前倒计时 每秒刷一次 秒数真的在动用户才知道没卡死
        // 返 false 表示期间序号变了 换词 收起 切页 调用方立刻撤 别再发请求
        async 倒计时重试(序号, 前缀) {
            for (let 秒 = 重试等待秒; 秒 > 0; 秒--) {
                if (序号 !== this.搜索序号) return false;
                this.等待提示 = `${前缀} · ${秒} 秒后重试`;
                await new Promise((完成) => setTimeout(完成, 1000));
            }
            // 循环走完再判一次 最后一秒里可能刚好被换词
            if (序号 !== this.搜索序号) return false;
            this.等待提示 = '';
            return true;
        },

        // 滚到底要下一页 一次只发 1 个请求 用户不滚就不发
        // 用户驱动的节奏天然像人 比自动翻页省
        async 加载下一页() {
            const 词 = this.上次搜索过的词;
            const 下一页 = this.当前页 + 1;
            if (this.加载下一页中 || !词) return;
            if (下一页 > this.搜索总页数) return; // 到底了

            // 不自增序号 这是同一次搜索的延续 但每一步都比对 换词就丢结果
            const 序号 = this.搜索序号;
            this.加载下一页中 = true;
            this.搜索错误 = '';
            const 控制器 = new AbortController();
            this.中断控制器 = 控制器;
            try {
                // 翻页同样自动重试 用户正盯着面板等 最不该看到稍后再试
                let 结果 = null;
                for (let 次 = 0; 次 <= 重试次数上限; 次++) {
                    if (次 > 0) {
                        const 继续 = await this.倒计时重试(序号, '没抓到，再试一次喵');
                        if (!继续) return;
                    }
                    结果 = await 搜索(词, { 信号: 控制器.signal, 页: 下一页 });
                    if (序号 !== this.搜索序号) return;
                    if (结果.成功 && 结果.结果.length) break;
                    if (次 >= 重试次数上限) break;
                    if (!结果.成功 && !可重试失败(结果.错误)) break;
                }
                if (!结果?.成功) {
                    // 可重试的失败重试用尽也不弹错 再滚一下会再试一轮
                    // 只有重试也没用的真问题才值得占提示行
                    if (!可重试失败(结果?.错误)) this.搜索错误 = 结果?.错误 || '加载下一页失败';
                    return;
                }
                this.搜索结果 = [...this.搜索结果, ...结果.结果];
                this.当前页 = 结果.页 ?? 下一页;
                this.搜索总页数 = 结果.总页数 || this.搜索总页数;
                // 缓存跟着往前走 存的是加载到第几页的状态
                this.记缓存(词, {
                    结果: this.搜索结果,
                    页: this.当前页,
                    总页数: this.搜索总页数,
                });
            } catch (错误) {
                const 说 = String(错误?.message ?? 错误);
                // 同上 过会再来类的异常不弹提示行 免得留一句永远擦不掉的错误
                if (序号 === this.搜索序号 && !可重试失败(说)) this.搜索错误 = 说;
            } finally {
                if (序号 === this.搜索序号) this.加载下一页中 = false;
            }
        },

        // 滚到底留 120px 余量就自动要下一页 每次只有 1 个请求
        面板滚动(事件) {
            const 盒 = 事件.target;
            if (盒.scrollHeight - 盒.scrollTop - 盒.clientHeight < 120) this.加载下一页();
        },

        // 放大镜和回车都走这里 只负责把结果铺开看 不再触发搜索
        // 搜索本身是输入就搜 再手动触发一次只多打一个请求 本站 5 到 6 秒硬限速 白发
        展开面板() {
            if (!this.关键词.trim()) return; // 没词可展
            this.打开关联面板 = true;
            this.展开 = true;
            this.$refs.输入区?.blur(); // 收起软键盘 面板才铺得满
        },

        // 列表页只给更新日期不给章名 要章名得逐本拉详情 一本一个请求 6 秒硬限速
        // 这一行给的就是最近更新时间 源按协议放 扩展.更新日期
        更新文案(项) {
            const 日期 = 项?.扩展?.更新日期;
            const 天 = 相对天数(日期);
            if (天 === null) return 日期 ? `${日期} 更新` : '好像没有';
            if (天 === 0) return '今天更新';
            if (天 === 1) return '昨天更新';
            if (天 <= 30) return `${天} 天前更新`;
            return `${日期}`;
        },

        async 执行搜索(词) {
            const 关键词 = String(词 ?? this.关键词).trim();
            if (!关键词) return;
            if (this.防抖计时器) {
                clearTimeout(this.防抖计时器);
                this.防抖计时器 = null;
            }
            this.关键词 = 关键词;
            this.打开关联面板 = true;
            this.展开 = true; // 直接点击搜索就展开面板
            this.$refs.输入区?.blur();

            // 先出结果再记历史 读缓存 0 延迟 不该被写历史读分组挡在后面
            const 搜索任务 = this.去搜索(关键词);
            try {
                await 记一次行为('搜索', { 标题: 关键词 });
                this.历史分组 = await 读取分组();
            } catch {
                /* 记历史失败无妨 */
            }
            await 搜索任务;
        },

        // 点词条用整词搜 然后直接开精确结果 源标了 扩展.精确匹配 那条 没有就取第一条
        async 点词条() {
            const 词 = this.关键词.trim();
            if (!词) return;
            await this.执行搜索(词);
            const 精确 = this.搜索结果.find((项) => 项?.扩展?.精确匹配) ?? this.搜索结果[0];
            if (精确) this.点结果(精确);
        },

        // 点一条结果 开详情子页
        async 点结果(项) {
            if (!项?.标识) return;
            // 搜索记词 选中后升级为书 把那条第词记录就地改成这本书
            // 标题换书名 补源和资源标识 不新增 否则历史里堆一串重复
            try {
                await 记一次行为('浏览', {
                    标题: this.上次搜索过的词 || 项.书名,
                    改标题: 项.书名,
                    源: this.当前源标识 || undefined,
                    资源标识: 项.标识,
                });
                this.历史分组 = await 读取分组();
            } catch {
                /* 记历史失败无妨 */
            }
            this.$emit('打开详情', { 书: 项, 源: this.当前源标识 });
        },

        // 收起 点隔离层 点页面别处 清空输入都走这里
        // 收起就是打断本次搜索 面板可见才算搜索中
        // 面板关了还继续跑 白等一轮限速重试 还把结果写进没人看的界面
        收起() {
            this.展开 = false;
            this.打开关联面板 = false;
            this.打断搜索();
        },

        // 外部要求结束本次搜索 目前只有切到别的页会调
        // 切页和返回一样结束搜索 所以走同一条路
        结束搜索() {
            this.收起();
        },

        // 打断在飞的搜索 靠序号自增 去搜索每一步都比对 对不上就静默退出
        // 不需要真的 abort 请求已经发出去了 让它跑完塞进缓存更好
        打断搜索() {
            this.搜索序号++;
            if (this.防抖计时器) {
                clearTimeout(this.防抖计时器);
                this.防抖计时器 = null;
            }
            // 真中止在飞那次 源后面还有几页没抓 光靠序号比对只是不显示 配额照占
            this.中断控制器?.abort();
            this.中断控制器 = null;
            this.搜索中 = false;
            this.等待提示 = '';
        },

        // 写缓存 Map 的 set 对已存在的键不改顺序 同词再搜要先 delete 再 set
        记缓存(词, 结果) {
            // 空字段的结果一律不进缓存 缓存是进程内的 存进去之后每次搜这个词都看到未知书名
            // 明明重搜一次就正常 宁可这次不缓存 也不能让坏数据锁死
            const 列表 = Array.isArray(结果?.结果) ? 结果.结果 : [];
            if (列表.some((项) => !项 || !String(项.书名 || '').trim())) return;
            this.结果缓存.delete(词);
            this.结果缓存.set(词, 结果);
            this.修剪缓存();
        },
        // 超容丢最老的 Map 保持插入顺序 第一个键就是最久没更新的
        修剪缓存() {
            while (this.结果缓存.size > 缓存份数) {
                this.结果缓存.delete(this.结果缓存.keys().next().value);
            }
        },
        点击会话(会话) {
            // 历史里的会话也是书 同样开详情
            // 老记录可能没有 标识 早期只有标题 那就退回填进输入框
            if (会话.标识) {
                this.$emit('打开详情', {
                    书: {
                        标识: 会话.标识,
                        书名: 会话.标题,
                        作者: 会话.作者 || '',
                        封面: 会话.封面地址?.startsWith('data:') ? 会话.封面地址 : '',
                    },
                    源: 会话.源 || this.当前源标识,
                });
                return;
            }
            this.关键词 = 会话.标题;
            this.打开关联面板 = true;
            this.展开 = true;
            this.$refs.输入区?.focus();
        },
        切换分组(索引) {
            this.历史分组[索引].收回 = !this.历史分组[索引].收回;
        },
        处理背景点击(事件) {
            // 点搜索区以外就收起 同样会打断搜索
            if (!事件.target.closest('.搜索区')) this.收起();
        },
    },
};
</script>

<style lang="scss" scoped>
.搜索页 {
    position: relative;
    height: 100%;
    width: 100%;
    box-sizing: border-box;
    padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px));
    overflow: hidden auto;
    /* 不用 overscroll-behavior: contain 会连带关掉安卓原生下拉回弹 */
    overscroll-behavior: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    background-color: var(--搜索页-底);
    /* 展开态是全屏浮层 整页锁滚动 不然面板滚到底继续拖 背后的历史记录跟着动 就是穿帮 */
    &.面板展开 {
        overflow: hidden;
    }
}
/* 展开态隔离层 模糊但不压暗 背景色留完全透明 给了 rgba 就变压暗 */
.搜索隔离层 {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 1;
    opacity: 0;
    pointer-events: none;
    background-color: transparent;
    -webkit-backdrop-filter: blur(0px);
    backdrop-filter: blur(0px);
    transition: opacity .3s, backdrop-filter .3s;
    &.显示 {
        opacity: 1;
        pointer-events: auto;
        -webkit-backdrop-filter: blur(14px);
        backdrop-filter: blur(14px);
    }
}
.搜索区 {
    position: sticky;
    top: env(safe-area-inset-top, 35px);
    width: 70%;
    margin-top: 45vh;
    flex-shrink: 0;
    z-index: 2;
    transition: all .3s;
    &::before {
        content: attr(data-欢迎语);
        position: absolute;
        top: -50px;
        left: 50%;
        white-space: nowrap;
        font-size: 1.6rem;
        font-family: "Huninn", system-ui, sans-serif;
        transform: translateX(-50%);
        transition: all .3s;
    }
    /* 面板可见性由 打开关联面板 控制 不是只由 展开 控制
       打开关联面板 = 有没有内容要显示 收起态也要显示前 5 条
       展开 = 要不要铺满屏幕 */
    &.打开关联面板 .关联面板 {
        opacity: 1;
        transform: none;
        pointer-events: auto;
    }
    /* 展开态 脱离流 贴状态栏下沿 左右留 15px */
    &.展开 {
        position: absolute;
        top: env(safe-area-inset-top, 0px);
        left: 15px;
        right: 15px;
        width: auto;
        margin-top: 0;
        z-index: 3;
        display: flex;
        flex-direction: column;
        max-height: calc(100% - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 5rem);
        &::before {
            opacity: 0;
            top: -20px;
        }
        .输入区 {
            background-color: var(--搜索框-背景-聚焦);
            width: 75%;
        }
        .关联面板 {
            position: static;
            top: auto;
            left: auto;
            max-height: none;
            min-height: 0;
            flex: 1 1 auto;
            margin-top: 10px;
            opacity: 1;
            transform: none;
            pointer-events: auto;
        }
        .go搜索 {
            background-color: var(--主题色);
        }
        .清空输入 {
            right: calc(12% + 5px);
        }
    }
    .搜索框 {
        display: flex;
        position: relative;
        overflow: hidden;
        width: 100%;
        flex-shrink: 0;
    }
    .go搜索 {
        height: 70%;
        aspect-ratio: 1;
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all .3s;
        background-color: var(--搜索图标-基色);
        -webkit-tap-highlight-color: transparent;
        -webkit-mask: var(--图标) center / contain no-repeat;
        mask: var(--图标) center / contain no-repeat;
        &:hover::after,&:active::after {background-color: var(--搜索图标-激活);}
    }
    .输入区 {
        width: 100%;
        box-sizing: border-box;
        border: var(--搜索框-描边) 2px solid;
        background-color: var(--搜索框-背景);
        backdrop-filter: blur(2px);
        border-radius: 1.5rem;
        height: 2.75rem;
        transition: all .3s;
        padding: 0 25% 0 17px;
        font-size: inherit;
        color: var(--文本主色);
        &:focus {
            outline: none;
            border: var(--搜索框-描边-聚焦) 2px solid;
        }
    }
    .清空输入 {
        position: absolute;
        aspect-ratio: 1;
        height: 70%;
        right: calc(12% + 15px);
        top: 50%;
        transition: all .3s;
        transform: translateY(-50%);
        border-radius: 50%;
        background-color: transparent;
        display: none;
        align-items: center;
        justify-content: center;
        color: var(--清空按钮-图标);
        z-index: 1;
        -webkit-tap-highlight-color: transparent;
        &::after {
            content: '';
            width: 100%;
            height: 100%;
            background-color: currentColor;
            -webkit-mask: var(--图标) center / contain no-repeat;
            mask: var(--图标) center / contain no-repeat;
        }
        &.显示清空 {
            display: flex;
        }
        &:hover,
        &:active {
            color: var(--清空按钮-图标-激活);
        }
    }
    .关联面板 {
        position: absolute;
        top: calc(100% + 10px);
        left: 0;
        width: 100%;
        min-height: 1rem;
        max-height: 30vh;
        overscroll-behavior: contain;
        border-radius: 1.5rem;
        border: var(--关联面板-描边) 2px solid;
        background-color: var(--关联面板-底);
        backdrop-filter: blur(5px);
        transition: all .3s;
        overflow-y: auto;
        box-sizing: border-box;
        opacity: 0;
        transform: scale(.8) translateY(20px);
        pointer-events: none;
        .词条 {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 14px;
            cursor: pointer;
            border-bottom: 1px solid var(--关联面板-描边);
            color: var(--关联项-文字);
            -webkit-tap-highlight-color: transparent;
            .词条图标 {
                flex: 0 0 auto;
                width: 1rem;
                height: 1rem;
                background-color: currentColor;
                -webkit-mask: var(--图标) center / contain no-repeat;
                mask: var(--图标) center / contain no-repeat;
                opacity: .7;
            }
            .词条文字 {
                font-size: .9rem;
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
            }
            &:hover,
            &:active {
                background-color: var(--关联项-底-悬停);
                color: var(--关联项-文字-悬停);
            }
        }
        .结果项:not(:last-child) {
            &::after {
                position: absolute;
                content: '';
                height: 1px;
                width: 80%;
                bottom: 0;
                left: 50%;
                transform: translateX(-40%);
                background-color: var(--设置项-分隔线);
            }
        }
        .结果项 {
            position: relative;
            display: flex;
            align-items: center;
            gap: 12px;
            height: 6rem;
            padding: 8px;
            -webkit-tap-highlight-color: transparent;
            &:hover,&:active {
                background-color: var(--关联项-底-悬停);
            }
            &.预搜索 {
                height: auto;
                padding: 10px 12px;
            }
            img {
                flex: 0 0 auto;
                height: 100%;
                aspect-ratio: 1/1.45;
                border-radius: .5rem;
                object-fit: cover;
                object-position: center;
                background-color: var(--蓝灰);
            }
            .结果信息 {
                min-width: 0;
                display: flex;
                flex-grow: 1;
                height: 100%;
                flex-direction: column;
                justify-content: start;
                gap: 2px;
                .书名 {
                    font-size: 1rem;
                    color: var(--关联项-文字);
                    overflow: hidden;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                }
                .作者, .更新至 {
                    font-size: .7rem;
                    color: var(--文本淡色);
                    overflow: hidden;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                }
            }
            .结果状态 {
                flex: 0 0 auto;
                font-size: .7rem;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 1.5rem;
                padding: 6px;
                aspect-ratio: 16/9;
                color: var(--文本淡色);
                white-space: nowrap;
                &[data-状态="已完结"] { color: var(--资源状态-已完结); background-color: color-mix(in srgb, var(--资源状态-已完结) 10%, transparent);}
                &[data-状态="连载中"] { color: var(--资源状态-连载中); background-color: color-mix(in srgb, var(--资源状态-连载中) 10%, transparent);}
                &[data-状态="已下架"] { color: var(--资源状态-已下架); background-color: color-mix(in srgb, var(--资源状态-已下架) 10%, transparent);}
            }
        }
        .提示行 {
            padding-top: 1rem;
            font-size: .82rem;
            color: var(--文本淡色);
            display: flex;
            justify-content: center;
            align-items: center;
            height: 3rem;
            position: sticky;
            bottom: 0;
            background-color: var(--关联面板-底);
            backdrop-filter: blur(3px);
            border-radius: 0 0 1.3rem 1.3rem;
            &[data-状态="没有更多了喵"] {
                height: 1rem;
            }
        }
        .预搜索 {.结果信息 {
            flex-direction: row !important;
            align-items: center;
            justify-content: space-between !important;
            gap: 5px;
            .书名 {
                font-size: .9rem;
                flex-grow: 1;
                max-width: 80%;
            }
            .更新至 {
                display: none;
            }
        }}
        .预搜索:not(:last-child)::after {
            width: 90%;
            transform: translateX(-50%);
        }
    }
}
.历史记录区 {
    width: 100%;
    margin-top: 25vh;
    border: red 0px solid;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
    .分组 {
        width: calc(100% - 60px);
        display: grid;
        grid-template-rows: auto 1fr;
        transition: all .3s;
        .分组内容 {
            display: flex;
            flex-direction: column;
            align-items: center;
            overflow: hidden;
            padding-top: 10px;
        }
    }
    .分组-收回 {
        grid-template-rows: auto 0fr;
        .图标-箭头 {
            transform: rotate(0deg) !important;
        }
    }
    .分组框架 {
        width: calc(100% - 30px);
        display: flex;
        position: relative;
        gap: 10px;
        margin: 0 auto;
        align-items: center;
        transition: all .3s;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
        color: var(--历史-分组);
        font-size: 1.1rem;
        .时间 {
            font-size: .9rem;
        }
        .分割线 {
            flex: 1 1 0;
            background-color: var(--历史-分组);
            height: 1px;
        }
        .图标-箭头 {
            overflow: hidden;
            position: absolute;
            height: 1.8rem;
            aspect-ratio: 1;
            left: -25px;
            display: flex;
            align-items: center;
            justify-content: center;
            transform: rotate(90deg);
            svg {
                height: 100%;
            }
        }
    }
    .会话, .没更多力 {
        position: relative;
        width: 95%;
        height: 3.5rem;
        font-size: small;
        display: flex;
        align-items: center;
    }
    .会话 {
        width: calc(100% - 30px);
        gap: 15px;
        padding: 0 10px 0 0;
        border-radius: 1.5rem;
        transition: background .2s;
        -webkit-tap-highlight-color: transparent;
        &:hover, &:active {
            background-color: var(--历史-会话-底-悬停);
            color: var(--历史-会话-文字-悬停);
        }
        img {
            height: 80%;
            aspect-ratio: 1/1.45;
            border-radius: .2rem;
            object-fit: cover;
            object-position: center;
            background-color: var(--蓝灰);
        }
        .会话信息 {
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            max-width: 65%;
            > div:first-child {
                font-size: 1rem;
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
                color: var(--文本次色);
            }
            >div:last-child {
                color: var(--文本淡色);
            }
        }
        .会话行为 {
            white-space: nowrap;
            aspect-ratio: 16/9;
            border-radius: 1.5rem;
            font-size: .8rem;
            padding: .3rem;
            margin-left: auto;
            &[data-行为="搜索"] { color: var(--行为标签-搜索); background-color: color-mix(in srgb, var(--行为标签-搜索) 10%, transparent);}
            &[data-行为="浏览"] { color: var(--行为标签-浏览); background-color: color-mix(in srgb, var(--行为标签-浏览) 10%, transparent);}
            &[data-行为="下载"] { color: var(--行为标签-下载); background-color: color-mix(in srgb, var(--行为标签-下载) 10%, transparent);}
        }
    }
    .没更多力 {
        min-height: 100px;
        padding: 10px 0 0 0;
        justify-content: center;
    }
}
</style>
