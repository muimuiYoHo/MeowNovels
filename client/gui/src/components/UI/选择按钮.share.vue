<template>
    <div class="abc" :class="激活状态 ? '打开' : ''" :style="可以点击 ? '' : 'pointer-events: none;'">
        <p>{{ 按钮文本 }}</p>
        <div class="球" :style="可以点击 ? '' : 'opacity: .6;'"></div>
    </div>
</template>

<script>
export default {
    props: ['激活状态', '按钮文本', '可以点击'],
    data() {
        return {
        };
    }
}
</script>

<style lang="scss" scoped>
.abc {
    width: calc(100% - 20px);
    height: 50px;
    display: flex;
    position: relative;
    justify-content: space-between;
    gap: .5rem;
    padding: 0 10px;
    align-items: center;
    background-color: var(--卡片-1);
    transition: all .3s;
    border-radius: 10px;
    border: var(--边框色-淡) 1px solid;
    &::before {
        content: '';
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        transition: all .3s;
        border-radius: 10px;
    }
    &:hover {&::before {background-color: var(--边框色-淡);}}
    p {
        width: 10%;
        font-size: .9rem;
        white-space: nowrap;
        color: var(--文本主色);
    }
    .球 {
        position: relative;
        height: 55%;
        aspect-ratio: 16/9;
        border-radius: 50px / 50px;
        border: 1px solid var(--边框色-明);
        background-color: var(--边框色-淡);
        &::before {
            content: '';
            position: absolute;
            height: 70%;
            top: 50%;
            left: 10%;
            transform: translateY(-50%);
            aspect-ratio: 1;
            border-radius: 50%;
            background-color: var(--白);
            transition: all .3s;
            z-index: 1;
        }
        &::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border-radius: 50px / 50px;
            transition: all .3s;
        }
    }
}
.打开 {
    .球 {
        &::before {left: 55%;}
        &::after {background-color: var(--主题色);}
    }
}
.不可点击 {
    pointer-events: none;
    > div {opacity: .6;}
}
</style>