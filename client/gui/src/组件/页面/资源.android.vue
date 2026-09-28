<template>
    <div class="资源页">
        <div class="快捷键"></div>
        <div v-for="卡片 in 卡片列表" :key="卡片.类型" :data-卡片类型="卡片.类型" @click="$emit('打开子页', 卡片.类型)">
            <div class="卡片内容">{{ 卡片.空态 }}</div>
            <div class="进入卡片空间" :style='{ "--图标": `url("${图标表.进入卡片空间}")` }'></div>
        </div>
    </div>
</template>

<script>
import 图标表 from '../../资源/页面图标';
export default {
    name: "资源Android",
    emits: ["打开子页"],
    data() {
        return {
            图标表,
            // 骨架占位：三张卡对应原型「我的收藏 / 我的下载 / 我的仓库」，列表内容待设计
            卡片列表: [
                { 类型: "我的收藏", 渐变卡面: true, 空态: "还没有收藏喵~" },
                { 类型: "我的下载", 渐变卡面: false, 空态: "暂无下载任务" },
                { 类型: "我的仓库", 渐变卡面: false, 空态: "仓库空空如也" },
            ],
        };
    },
};
</script>

<style lang="scss" scoped>
.资源页 {
    position: relative;
    height: 100%;
    box-sizing: border-box;
    width: 100%;
    padding: 0 15px calc(100px + env(safe-area-inset-bottom, 0px));
    overflow: hidden auto;
    /* 不用 overscroll-behavior: contain —— 它会连带关掉安卓的原生下拉回弹（果冻效果） */
    overscroll-behavior: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
    background-color: var(--资源页-底);
    &::before,&::after { /*页面装饰*/
        content: '';
        position: absolute;
        border-radius: 50%;
        background-color: var(--资源页-光斑);
        z-index: 0;
        pointer-events: none;
    }
    &::before {
        width: 50%;
        aspect-ratio: 1;
        top: -16px;
        right: -16px;
        opacity: .3;
        filter: blur(50px);
    }
    &::after {
        width: 100%;
        aspect-ratio: 1;
        bottom: -10%;
        left: -35%;
        opacity: .2;
        filter: blur(50px);
    }
    > div:first-child {    // 快捷键条 原型为待设计的占位框，先留虚线占位
        margin-top: 45px;
        width: calc(100% - 20px);
        min-height: 40px;
        border: 1px dashed var(--快捷键-描边);
        border-radius: 1.5rem;
        box-sizing: border-box;
        z-index: 1;
    }
    > div ~ div {
        position: relative;
        box-sizing: border-box;
        width: calc(100% - 0px);
        min-height: 160px;
        padding: 10px;
        border-radius: 1.5rem;
        display: flex;
        flex-shrink: 0;
        background-color: var(--卡片-一般背景);
        box-shadow: var(--卡片-阴影) 0 0 8px;
        z-index: 1;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        &::before {
            position: absolute;
            content: attr(data-卡片类型);
            font-size: .8rem;
            font-weight: 800;
            color: var(--卡片-标题);
            top: 14px;
            left: 14px;
        }
        // 右上角操作位
        .进入卡片空间 {
            position: absolute;
            width: 30px;
            aspect-ratio: 1;
            background-color: var(--卡片-操作位底);
            box-shadow: var(--卡片-操作位阴影) 0 0 8px;
            border-radius: .7rem;
            top: 12px;
            right: 12px;
            &::before {
                position: absolute;
                content: '';
                width: 70%;
                top: 50%;
                left: 50%;
                transform: translate(-50%,-50%);
                aspect-ratio: 1;
                background-color: var(--黑);
                -webkit-mask: var(--图标) center / contain no-repeat;
                mask: var(--图标) center / contain no-repeat;
            }
        }
        &:active {
            transform: scale(.995);
        }
    }
    > div:nth-of-type(2) {
        width: 100%;
        min-height: 120px;
        aspect-ratio: 16 / 9;
        background: linear-gradient(to top, var(--收藏卡-渐变-起), var(--收藏卡-渐变-止) 95%);
        box-shadow: none;
        &::before {
            color: var(--收藏卡-标题);
        }
        .卡片内容 {
            color: var(--收藏卡-空态文字);
        }
    }
    .卡片内容 {
        margin: auto;
        color: var(--卡片-空态文字);
        font-size: .85rem;
    }
}
</style>
