<template>
    <div class="导航栏">
        <div
            v-for="项 in 导航项"
            :key="项.名称"
            :class="{ 选中: 项.索引 === 当前 }"
            @click="$emit('切换', 项.索引)"
        >
            <span class="导航图标" :style='{ "--图标": `url("${项.图标}")` }'></span>
            <p>{{ 项.名称 }}</p>
        </div>
    </div>
</template>

<script>
import 图标表 from '../../资源/页面图标';

export default {
    name: "导航栏Android",
    props: {
        // 当前页索引，与 App 的页序一致（0 搜索 / 1 资源 / 2 设置）
        当前: { type: Number, default: 0 },
    },
    emits: ["切换"],
    data() {
        return {
            导航项: [
                { 名称: "搜索", 索引: 0, 图标: 图标表.搜索 },
                { 名称: "资源", 索引: 1, 图标: 图标表.资源 },
                { 名称: "设置", 索引: 2, 图标: 图标表.背景设定 },
            ],
        };
    },
};
</script>

<style lang="scss" scoped>
// 贴底悬浮胶囊：位置与观感对齐 UI原型/android.html 的 .导航栏
.导航栏 {
    position: fixed;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 10px);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    justify-content: center;
    gap: 1px;
    padding: 3px;
    border: var(--导航栏-描边) 2px solid;
    border-radius: 50px;
    backdrop-filter: blur(1px);
    z-index: 10;
    > div {
        position: relative;
        width: 50px;
        height: 35px;
        border-radius: 50px;
        display: flex;
        flex-direction: column;
        justify-content: end;
        align-items: center;
        cursor: pointer;
        color: var(--导航栏-未选中);
        -webkit-tap-highlight-color: transparent;
        p {
            font-size: .8rem;
        }
    }
    // mask 上色：形状取自 --图标，颜色由 background-color 决定
    .导航图标 {
        position: absolute;
        width: 45%;
        aspect-ratio: 1;
        top: 50%;
        transform: translateY(-85%);
        background-color: var(--导航栏-未选中);
        -webkit-mask: var(--图标) center / contain no-repeat;
        mask: var(--图标) center / contain no-repeat;
        transition: background-color .3s;
        z-index: 2;
    }
    .选中 {
        color: var(--导航栏-选中);
        .导航图标 {
            background-color: var(--导航栏-选中);
        }
        &::before {
            content: '';
            position: absolute;
            width: 100%;
            aspect-ratio: 1.4;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            border-radius: 50px;
            background-color: var(--导航栏-选中背景);
            z-index: 1;
        }
    }
}
</style>
