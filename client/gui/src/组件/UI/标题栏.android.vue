<template>
    <div class="标题栏">
        <div><button v-if="显示返回" class="返回按钮" :style='{ "--图标": `url("${图标表.返回}")` }' @click="$emit('返回')" ></button></div>
        <span v-if="标题" class="标题">{{ 标题 }}</span>
    </div>
</template>

<script>
import 图标表 from '../../资源/页面图标';

export default {
    name: "标题栏Android",
    props: {
        // 标题文字 留空只显示返回按钮
        标题: { type: String, default: "" },
        // 是否显示返回按钮 有标题但退不出去的场景可以关掉
        显示返回: { type: Boolean, default: true },
    },
    emits: ["返回"],
    data() {
        return {
            图标表, // 必须放进 data 模板才能取到 script 里的 import
        };
    },
};
</script>

<style lang="scss" scoped>
.标题栏 {
    position: absolute;
    top: env(safe-area-inset-top, 0px);
    z-index: 25;
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 0 0 auto;
    height: 3rem;
    padding-right: 20px;
    > * {
        background-color: var(--标题栏元素-背景);
        backdrop-filter: blur(5px);
        border-radius: 1.5rem;
    }
    > div:first-child {
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 10px;
    }
}
.返回按钮 {
    border: none;
    padding: 0;
    -webkit-tap-highlight-color: transparent;
    height: 100%;
    aspect-ratio: 1;
    background-color: var(--文本主色, #12142a);
    -webkit-mask: var(--图标) center / contain no-repeat;
    mask: var(--图标) center / contain no-repeat;
}
.标题 {
    display: flex;
    align-items: center;
    height: 100%;
    padding: 0 15px;
    font-size: 1.3rem;
    font-weight: 500;
    color: var(--文本主色, #12142a);
}
</style>
