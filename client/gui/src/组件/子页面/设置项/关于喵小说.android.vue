<template>
    <div class="子页面">
        <TitleBar 标题="关于" @返回="$emit('返回')" />
        <div class="内容区">
            <div>
                <div></div>
                <img :src="喵小说" alt="应用图标">
                <div>
                    <div class="名称">{{ 应用名称 }}</div>
                    <div class="简介">{{ 应用简介 }}</div>
                </div>
            </div>
            <div>
                <div :data-显示信息="`上次检查在 ` + 上次检查时间">检查更新</div>
                <div :data-显示信息="应用版本">软件版本</div>
                <div :data-显示信息="UI版本">UI版本</div>
            </div>
            <div>
                <div :data-显示信息="浏览器 + ' ' + 内核版本"><img :style='{ "--图标": `url( "${图标表.核心}")` }'>内核版本</div>
            </div>
        </div>
    </div>
</template>

<script>
import 图标表 from '../../../资源/页面图标.ts';
import 应用图标 from '../../../资源/应用图标/ChatGPT Image 2026年9月26日 23_01_20.png';
import TitleBar from '../../UI/标题栏.android.vue';
import { 读取浏览器信息 } from '../../../方法/浏览器信息';
import { 获取信息, 初始信息 } from '../../../方法/获取信息';

export default {
    name: "关于喵小说",
    components: { TitleBar },
    emits: ["返回"],
    data() {
        return {
            图标表,// 必须放进 data / computed才能在模板里用
            喵小说: 应用图标,

            // 先用初始数据同步取让初始就有内容不会先空一下
            应用名称: 初始信息('基本信息', '应用名称'),
            应用简介: 初始信息('基本信息', '简介'),
            应用版本: 初始信息('基本信息', '软件版本'),
            UI版本: 初始信息('基本信息', 'UI版本'),
            上次检查时间: 初始信息('状态', '上次检查时间'),
            // 浏览器信息是同步的 直接在 data 里取就够 不必绕进 mounted 的 Promise.all
            // 内核主版本只给主版本号 要完整串就换成 内核版本
            内核版本: 读取浏览器信息('内核主版本'),
            浏览器: 读取浏览器信息('内核'),
        };
    },
    async mounted() {
        // 并发取 模块内部按文件缓存 Promise 所以这里实际只读 2 个文件
        const [应用名称, 应用简介, 应用版本, UI版本, 上次检查时间] = await Promise.all([
            获取信息('基本信息', '应用名称'),
            获取信息('基本信息', '简介'),
            获取信息('基本信息', '软件版本'),
            获取信息('基本信息', 'UI版本'),
            获取信息('状态', '上次检查时间'),
        ]);
        this.应用名称 = 应用名称;
        this.应用简介 = 应用简介;
        this.应用版本 = 应用版本;
        this.UI版本 = UI版本;
        this.上次检查时间 = 上次检查时间;
    },
};
</script>

<style lang="scss" scoped>
.子页面 {
    position: relative;
    height: 100%;
    width: 100%;
    display: flex;
    padding: 0 15px;
    overflow: hidden;
    flex-direction: column;
    background-color: var(--页面背景);
    .内容区 {
        display: flex;
        flex-direction: column;
        align-items: center;
        overflow: hidden auto;
        flex: 1 1 auto;
        min-height: 0;
        width: 100%;
        gap: 15px;
        font-family: "Huninn", system-ui, sans-serif;
        padding: max(30px, calc(env(safe-area-inset-top, 10px) + 3rem + 15px)) 0 max(15px, env(safe-area-inset-bottom, 0) * 1.5);
        > * {
            flex-shrink: 0;
        }
        > div:first-child {       //应用图标
            position: relative;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-direction: column;
            height: calc(38.2vh - max(30px, calc(env(safe-area-inset-top, 10px) + 3rem + 15px)));
            width: 100%;
            > * {flex-grow: 1;}
            > div:nth-of-type(2) {
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
            }
            img {
                max-height: 62.8%;
                position: relative;
                aspect-ratio: 1;
                object-fit: contain;
                object-position: center;
            }
            .名称 {
                font-size: 1.3rem;
            }
            .简介 {
                font-size: .8rem;
                color: var(--文本次色);
            }
        }
        > div ~ div {
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 15px;
            width: 100%;
            padding: 15px;
            border-radius: 1.5rem;
            font-size: 1.1rem;
            background-color: var(--内容卡片);
            > div {
                position: relative;
                display: flex;
                align-items: center;
                gap: 5px;
                &::after {
                    position: absolute;
                    content: attr(data-显示信息);
                    color: var(--文本淡色);
                    top: 50%;
                    transform: translateY(-50%);
                    right: 0;
                    font-size: .8rem;
                }
                img {
                    height: 1rem;
                    aspect-ratio: 1;
                    background-color: var(--黑);
                    -webkit-mask: var(--图标) center / contain no-repeat;
                    mask: var(--图标) center / contain no-repeat;
                }
            }
        }
    }
}
</style>
