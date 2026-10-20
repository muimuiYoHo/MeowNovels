<template>
    <div class="子页">
        <TitleBar 标题="" @返回="$emit('返回')" />
        <div class="内容区">
        </div>
    </div>
</template>

<script>
import 图标表 from '../../../资源/页面图标.ts';
import { 安卓吐司 } from '../../../方法/吐司';
import TitleBar from '../../UI/标题栏.android.vue';

export default {
    name: "模板",
    emits: ["返回"],
    components: { TitleBar },
    data() {
        return {
            图标表,
        };
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
        padding: max(30px, calc(env(safe-area-inset-top, 10px) + 3rem)) 0 max(15px, calc(env(safe-area-inset-bottom, 10px) + 15px));
    }
}
</style>
