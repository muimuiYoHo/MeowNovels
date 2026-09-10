<template>
    <div class="首页">
        <div>
            <div>hh</div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <hr>
        </div>
    </div>
</template>

<script>
export default {
}
</script>

<style lang="scss" scoped>
.首页 {
    display: flex;
    position: relative;
    flex-direction: column;
    // flex-wrap: wrap;
    width: calc(100% - 1rem);
    padding: 1rem;
    gap: .5rem;
    background-color: var(--通用背景色-2);
    hr {
        position: relative;
        margin: 25px 0;
        border: none;
        height: 1rem;
        &::before {
            content: '偶也是有底线的喵';
            position: absolute;
            top: -25%;
            left: 50%;
            transform: translateX(-50%);
            color: var(--文本次色);
            font-size: .9rem;
        }
        &::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 95%;
            height: .5px;
            background-color: gray;
        }
    }
    > div > div {
        width: 10px;
        height: 100px;
        background-color: bisque;
    }
    > div > div:nth-child(2n+1) {
        background-color: rgb(137, 255, 34);}
}
</style>