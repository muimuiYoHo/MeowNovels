<template>
    <div class="设置页" :style='{ "--图标-箭头": `url("${图标表.箭头前进iOS}")` }'>
        <div class="我的分区">
            <div class="头像">
                <img :src="头像" alt="头像">
                <div
                    class="头像编辑"
                    aria-label="添加照片"
                    :style='{ "--图标": `url("${图标表.添加照片}")` }'
                    @click="$emit('换头像')"
                ></div>
            </div>
            <div class="昵称 文本">{{ 昵称 }}</div>
            <div class="信息 文本">{{ 信息 }}</div>
        </div>

        <div class="设置分区">
            <div v-for="类 in 设置类列表" :key="类.名称" class="设置类" :data-细分类型="类.名称">
                <div
                    v-for="项 in 类.项列表"
                    :key="项.标题"
                    class="设置项"
                    @click="$emit('打开设置项', 项.标题)"
                >
                    <div class="项图标"></div>
                    <div class="项标题">{{ 项.标题 }}</div>
                </div>
            </div>
            <span class="版本号">ui版本: {{ ui版本 }}</span>
        </div>
    </div>
</template>

<script>
import 图标表 from '../../资源/页面图标';
import 头像图 from '../../资源/图片/1420803610.jpg';
import 包信息 from '../../../package.json';

export default {
    name: "设置Android",
    emits: ["打开设置项", "换头像"],
    data() {
        return {
            图标表,
            头像: 头像图,
            昵称: "傲娇",
            信息: "3584527102@qq.com",
            // 骨架占位：设置项清单待确定，图标位先留空块
            设置类列表: [
                {
                    名称: "常规",
                    项列表: [{ 标题: "外观" }, { 标题: "语言" }, { 标题: "浏览器引擎版本" }],
                },
                {
                    名称: "下载",
                    项列表: [{ 标题: "资源目录" }, { 标题: "下载限制" }],
                },
                {
                    名称: "帮助",
                    项列表: [{ 标题: "关于喵小说" }, { 标题: "问题反馈" }],
                },
            ],
            ui版本: `v${包信息.version}`,
        };
    },
};
</script>

<style lang="scss" scoped>
.设置页 {
    position: relative;
    box-sizing: border-box;
    height: 100%;
    width: 100%;
    padding: 0 15px;
    overflow: hidden auto;
    overscroll-behavior: contain;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    background-color: var(--设置页-底);
    .我的分区 {
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: end;
        flex-shrink: 0;
        height: calc(38.2vh - 35px);
        min-height: 120px;
        max-height: 38.2vh;
        width: calc(100% - 24px);
        box-sizing: border-box;
        .头像 {
            height: 38.2%;
            aspect-ratio: 1;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            > img {
                width: 100%;
                aspect-ratio: 1;
                border-radius: 50%;
                object-fit: contain;
                object-position: center;
            }
        }
        .头像编辑 {
            width: 25%;
            aspect-ratio: 1;
            background-color: var(--头像编辑-底);
            position: absolute;
            bottom: 3px;
            right: 6px;
            border: 3px solid var(--头像编辑-描边);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            cursor: pointer;
            -webkit-tap-highlight-color: transparent;
            &::after {
                content: '';
                width: 70%;
                height: 70%;
                background-color: var(--头像编辑-图标);
                -webkit-mask: var(--图标) center / contain no-repeat;
                mask: var(--图标) center / contain no-repeat;
            }
        }
        .文本 {
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .昵称 {
            font-size: 1.2rem;
            letter-spacing: .5em;
            text-indent: .5em;
            color: var(--昵称-文字);
        }
        .信息 {
            margin-bottom: 35px;
            font-size: .8rem;
            color: var(--信息-文字);
        }
    }
    .设置分区 {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 40px;
        padding: 0 0 130px;
        width: calc(100% - 0px);
        flex-shrink: 0;
        box-sizing: border-box;
        > div {
            display: flex;
            flex-direction: column;
            gap: 12px;
            position: relative;
            width: 100%;
            min-height: 55px;
            flex-shrink: 0;
            padding: 10px;
            border-radius: 1.5rem;
            background-color: var(--设置卡-底);
            &::before {
                position: absolute;
                content: attr(data-细分类型);
                color: var(--设置卡-分类名);
                top: -25px;
                left: 13px;
                font-size: .8rem;
            }
            > div:not(:last-of-type)::before {
                position: absolute;
                content: '';
                width: 75%;
                height: 1px;
                bottom: -8px;
                left: 50%;
                transform: translateX(-50%);
                background-color: var(--设置项-分隔线);
            }
        }
        .版本号 {
            position: absolute;
            bottom: calc(90px + env(safe-area-inset-bottom, 0px));
            left: 50%;
            transform: translateX(-50%);
            font-size: .8rem;
            color: var(--版本号-文字);
        }
        .设置项 {
            position: relative;
            display: flex;
            align-items: center;
            gap: 10px;
            height: 2vh;
            min-height: 30px;
            cursor: pointer;
            -webkit-tap-highlight-color: transparent;
            // mask 上色，颜色由 --设置项-箭头 控制
            &::after {
                position: absolute;
                content: '';
                right: 0;
                top: 50%;
                height: 50%;
                aspect-ratio: 1;
                transform: translateY(-50%);
                background-color: var(--设置项-箭头);
                -webkit-mask: var(--图标-箭头) center / contain no-repeat;
                mask: var(--图标-箭头) center / contain no-repeat;
            }
            // 图标位占位：真实图标待定
            .项图标 {
                height: 100%;
                aspect-ratio: 1;
                border-radius: 0.75rem;
                background-color: var(--设置项-图标占位);
                flex-shrink: 0;
            }
            .项标题 {
                font-size: .9rem;
            }
        }
    }
}
</style>
