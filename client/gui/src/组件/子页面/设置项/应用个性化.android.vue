<template>
    <div class="子页">
        <TitleBar 标题="应用个性化" @返回="$emit('返回')" />
    </div>
</template>

<script>
import TitleBar from '../../UI/标题栏.android.vue';

export default {
    name: "应用个性化",
    components: { TitleBar },
    emits: ["返回"],
};
</script>

<style scoped>
/* 与主壳一致：扁平 CSS，不用 SCSS 嵌套（部分 WebView 会丢规则） */
.子页 {
    position: relative;
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    background-color: var(--页面背景);
    /* index.html 有 viewport-fit=cover，状态栏是沉浸式的 ——
       不加这个，标题栏会顶到状态栏下面（实测会被时间和信号图标压住）。 */
    padding-top: env(safe-area-inset-top, 0px);
}
</style>
