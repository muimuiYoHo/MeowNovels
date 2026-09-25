<template>
    <div class="搜索页" @click="处理背景点击">
        <div class="搜索区" :class="打开关联面板 ? '打开关联面板' : '关闭关联面板'">
            <div class="搜索框">
                <input
                    ref="输入区"
                    :value="关键词"
                    type="text"
                    class="输入区"
                    @input="处理输入"
                    @focus="聚焦输入"
                    @keydown.enter="执行搜索()"
                />
                <div
                    class="清空输入"
                    :class="{ 显示清空: 关键词.length > 0 }"
                    :style='{ "--图标": `url("${图标表.关闭_小}")` }'
                    @click.stop="清空输入内容"
                ></div>
                <button
                    class="go搜索"
                    aria-label="搜索"
                    :style='{ "--图标": `url("${图标表.搜索}")` }'
                    @click.stop="执行搜索()"
                ></button>
            </div>
            <div class="关联面板">
                <div
                    v-for="(项, 索引) in 关联项列表"
                    :key="索引"
                    class="关联项"
                    @click.stop="点关联项(项)"
                >
                    {{ 项 }}
                </div>
            </div>
        </div>

        <div class="历史记录区">
            <div
                v-for="(分组, 索引) in 历史分组"
                :key="分组.时间"
                class="分组"
                :class="{ '分组-收回': 分组.收回 }"
            >
                <div class="分组框架" @click="切换分组(索引)">
                    <div class="图标-箭头">
                        <svg height="20px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z"/></svg>
                    </div>
                    <div class="时间">{{ 分组.时间 }}</div>
                    <div class="分割线"></div>
                </div>
                <div class="分组内容">
                    <div
                        v-for="(会话, 会话索引) in 分组.会话列表"
                        :key="会话索引"
                        class="会话"
                        @click.stop="点击会话(会话)"
                    >
                        <div>{{ 会话.标题 }}</div>
                        <div>{{ 会话.说明 }}</div>
                    </div>
                </div>
            </div>
            <div class="没更多力">没有更多了喵~</div>
        </div>
    </div>
</template>

<script>
import 图标表 from '../../资源/页面图标';

export default {
    name: "搜索Android",
    data() {
        return {
            图标表,
            关键词: "",
            打开关联面板: false,
            关联项列表: [],
            // 骨架占位：历史记录尚未落盘，先给最小可交互样本
            历史分组: [
                {
                    时间: "今天",
                    收回: false,
                    会话列表: [
                        { 标题: "历史1", 说明: "23148933" },
                        { 标题: "历史2", 说明: "0721" },
                    ],
                },
                {
                    时间: "昨天 | 8.26",
                    收回: true,
                    会话列表: [{ 标题: "历史6", 说明: "23333333333333333333" }],
                },
                {
                    时间: "一周前 | 8.19",
                    收回: true,
                    会话列表: [{ 标题: "历史11", 说明: "266666666666666" }],
                },
            ],
        };
    },
    methods: {
        处理输入(事件) {
            this.关键词 = 事件.target.value;
            if (this.关键词.trim()) {
                this.刷新关联项();
                this.打开关联面板 = true;
            } else {
                this.打开关联面板 = false;
            }
        },
        刷新关联项() {
            const 词 = this.关键词.trim();
            this.关联项列表 = 词
                ? [`搜索「${词}」`, `${词} · 作者`, `${词} · 标签`]
                : ["输入书名或作者喵~"];
        },
        聚焦输入() {
            if (this.关键词.trim()) {
                this.刷新关联项();
                this.打开关联面板 = true;
            }
        },
        清空输入内容() {
            this.关键词 = "";
            this.打开关联面板 = false;
            this.$refs.输入区?.focus();
        },
        点关联项(项) {
            if (项.startsWith("搜索「")) {
                this.执行搜索(项.replace(/^搜索「|」$/g, ""));
                return;
            }
            this.关键词 = 项.split(" · ")[0];
            this.刷新关联项();
        },
        执行搜索(词) {
            const 关键词 = (词 ?? this.关键词).trim();
            if (!关键词) return;
            this.关键词 = 关键词;
            this.打开关联面板 = false;
            // 骨架占位：仅往「今天」分组插一条本地记录，真实搜索与持久化待接入
            const 今天 = this.历史分组[0];
            today.会话列表.unshift({ 标题: 关键词, 说明: "刚刚搜索" });
            今天.收回 = false;
            this.$refs.输入区?.blur();
        },
        点击会话(会话) {
            this.关键词 = 会话.标题;
            this.刷新关联项();
            this.打开关联面板 = true;
            this.$refs.输入区?.focus();
        },
        切换分组(索引) {
            this.历史分组[索引].收回 = !this.历史分组[索引].收回;
        },
        处理背景点击(事件) {
            if (!事件.target.closest(".搜索区")) this.打开关联面板 = false;
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
    overscroll-behavior: contain;
    display: flex;
    flex-direction: column;
    align-items: center;
    background-color: var(--搜索页-底);
}
.搜索区 {
    position: sticky;
    top: 12px;
    width: 70%;
    margin-top: 45vh;
    flex-shrink: 0;
    z-index: 2;
    transition: all .3s;
    &::before {
        content: '今天看点什么喵~';
        position: absolute;
        top: -50px;
        left: 50%;
        white-space: nowrap;
        font-size: 25px;
        transform: translateX(-50%);
    }
    .搜索框 {
        display: flex;
        position: relative;
        overflow: hidden;
        width: 100%;
    }
    .go搜索 {
        height: 100%;
        aspect-ratio: 1;
        position: absolute;
        background: none;
        right: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 50%;
        transition: all .3s;
        border: var(--无) 2px solid;
        -webkit-tap-highlight-color: transparent;
        &::after {
            content: '';
            width: 70%;
            height: 70%;
            background-color: var(--搜索图标-基色);
            -webkit-mask: var(--图标) center / contain no-repeat;
            mask: var(--图标) center / contain no-repeat;
            transition: background-color .3s;
        }
        &:hover::after,
        &:active::after {
            background-color: var(--搜索图标-激活);
        }
    }
    .输入区 {
        width: calc(100% - 0%);
        box-sizing: border-box;
        border: var(--搜索框-描边) 2px solid;
        background-color: var(--搜索框-底);
        backdrop-filter: blur(2px);
        border-radius: 50px;
        height: 40px;
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
        right: calc(15% + 6px);
        top: 50%;
        transform: translateY(-50%);
        border-radius: 50%;
        background-color: transparent;
        cursor: pointer;
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
        width: calc(100% - 0px);
        min-height: 120px;
        max-height: 20vh;
        margin-top: 10px;
        border-radius: 3mm;
        border: var(--关联面板-描边) 2px solid;
        background-color: var(--关联面板-底);
        backdrop-filter: blur(5px);
        transition: all .3s;
        overflow-y: auto;
        box-sizing: border-box;
        // 默认收起态：打开态由 .搜索区 的 &.打开关联面板 覆盖
        opacity: 0;
        transform: scale(.8) translateY(20px);
        pointer-events: none;
        .关联项 {
            padding: 10px 14px;
            font-size: .85rem;
            color: var(--关联项-文字);
            cursor: pointer;
            &:hover,
            &:active {
                background-color: var(--关联项-底-悬停);
                color: var(--关联项-文字-悬停);
            }
        }
    }
    // 打开态绑在 .搜索区 自身（模板的 :class 就挂在它上面），
    // 必须写连写选择器 &.，写成后代选择器 .打开关联面板 永远匹配不到
    &.打开关联面板 {
        width: 80%;
        .输入区 {
            width: calc(100% - 30%) !important;
        }
        .关联面板 {
            opacity: 1;
            transform: scale(1) translateY(0);
            pointer-events: auto;
        }
        .go搜索 {
            border: var(--搜索图标-边框) 2px solid;
        }
    }
}
.历史记录区 {
    width: 100%;
    margin-top: auto;
    padding-top: 60px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
    .分组 {
        width: 80%;
        display: grid;
        grid-template-rows: auto 1fr;
        transition: all .3s;
        .分组内容 {
            display: flex;
            flex-direction: column;
            overflow: hidden;
            min-height: 0;
        }
    }
    .分组-收回 {
        grid-template-rows: auto 0fr;
        .图标-箭头 {
            transform: rotate(0deg) !important;
        }
    }
    .分组框架 {
        width: 100%;
        display: flex;
        position: relative;
        gap: 10px;
        align-items: center;
        transition: all .3s;
        cursor: pointer;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
        color: var(--历史-分组);
        .时间 {
            font-size: small;
        }
        .分割线 {
            flex: 1 1 0;
            background-color: var(--历史-分组);
            height: 1px;
        }
        .图标-箭头 {
            overflow: hidden;
            position: absolute;
            height: 20px;
            aspect-ratio: 1;
            top: 0;
            left: -20px;
            display: flex;
            transform: rotate(90deg);
        }
    }
    .会话,
    .没更多力 {
        position: relative;
        width: 95%;
        min-height: 50px;
        font-size: small;
        display: flex;
        justify-content: center;
        color: var(--历史-会话-文字);
    }
    .会话 {
        flex-direction: column;
        cursor: pointer;
        border-radius: 8px;
        transition: background .2s;
        -webkit-tap-highlight-color: transparent;
        &:hover,
        &:active {
            background-color: var(--历史-会话-底-悬停);
            color: var(--历史-会话-文字-悬停);
        }
    }
    .没更多力 {
        min-height: 100px;
        padding: 10px 0 0 0;
    }
}
</style>
