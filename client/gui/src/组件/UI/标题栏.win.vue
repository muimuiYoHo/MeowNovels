<template>
    <div class="标题栏" :class="{ '最大化': 已最大化 }">
        <logo><img src="../../../src-tauri/icons/icon.png"></logo>
        <Tal>喵小说</Tal>
        <div class="拖拽区域" @dblclick="切换最大化"><slot></slot></div>
        <div class="控件区">
            <slot name="自定义控件">
                <div class="外观效果切换" @click="切换外观" :title="外观标题">
                    <div></div>
                    {{ 外观标签 }}
                </div>
            </slot>
            <div class="系统控件">
                <div class="按钮 最小化" @click="最小化" title="最小化喵"><Minimize /></div>
                <div class="按钮 最大化" @click="切换最大化" :title="已最大化 ? '还原喵' : '最大化喵'">
                    <Restore v-if="已最大化" />
                    <Maximize v-else />
                </div>
                <div class="按钮 关闭" @click="关闭" title="关闭偶"><Close /></div>
            </div>
        </div>
    </div>
</template>

<script>
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import Minimize from "../图标/最小化";
import Maximize from "../图标/最大化";
import Restore from "../图标/还原窗口大小";
import Close from "../图标/关闭";

const 窗口 = getCurrentWindow();

export default {
    components: { Minimize, Maximize, Restore, Close },
    data() {
        return {
            已最大化: false,
            外观索引: 0,
            外观列表: [
                { 效果: 'acrylic', 暗色: false, 标签: 'Win10毛玻璃-亮', 标题: 'Acrylic亮色' },
                { 效果: 'acrylic', 暗色: true,  标签: 'Win10毛玻璃-暗', 标题: 'Acrylic暗色' },
                { 效果: 'mica',    暗色: false, 标签: 'Win11亚克力-亮', 标题: 'Mica亮色' },
                { 效果: 'mica',    暗色: true,  标签: 'Win11亚克力-暗', 标题: 'Mica暗色' }
            ]
        };
    },
    computed: {
        当前外观() { return this.外观列表[this.外观索引]; },
        外观标签() { return this.当前外观.标签; },
        外观标题() { return this.当前外观.标题; }
    },
    async mounted() {
        this.已最大化 = await 窗口.isMaximized();
        this.$emit('最大化状态变化', this.已最大化);
        this._unlistenResize = await 窗口.onResized(async () => {
            this.已最大化 = await 窗口.isMaximized();
            this.$emit('最大化状态变化', this.已最大化);
        });
        // 应用初始外观
        this.应用外观();
    },
    beforeUnmount() {
        if (this._unlistenResize) {
            this._unlistenResize();
        }
    },
    methods: {
        async 最小化() {
            await 窗口.minimize();
        },
        async 切换最大化() {
            await 窗口.toggleMaximize();
        },
        async 关闭() {
            await 窗口.close();
        },
        async 切换外观() {
            this.外观索引 = (this.外观索引 + 1) % this.外观列表.length;
            await this.应用外观();
        },
        async 应用外观() {
            const { 效果, 暗色 } = this.当前外观;
            await 窗口.setEffects({
                effects: [效果],
                radius: 10.0,
                state: 'active'
            });
            await invoke('设置暗色模式', { 启用: 暗色 });
            document.documentElement.classList.toggle('暗色', 暗色);
        },
    }
};
</script>

<style lang="scss" scoped>
.标题栏 {
    display: flex;
    align-items: center;
    height: 32px;
    width: 100%;
    flex-shrink: 0;
    user-select: none;
}
logo {
    max-height: 80%;
    aspect-ratio: 1/1;
    margin: 0 .35rem;
    img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
}
Tal {
    color: var(--文本主色);
    transition: all .3s;
}
.拖拽区域 {
    flex: 1;
    height: 100%;
    display: flex;
    align-items: center;
    padding-left: 8px;
    -webkit-app-region: drag;
    app-region: drag;
    > * {
        -webkit-app-region: no-drag;
        app-region: no-drag;
    }
}

.控件区 {
    display: flex;
    align-items: center;
    height: 100%;
    margin-left: auto;
    -webkit-app-region: no-drag;
    app-region: no-drag;
}

.外观效果切换 {
    padding: 0 8px;
    height: 100%;
    display: flex;
    gap: 8px;
    align-items: center;
    cursor: pointer;
    font-size: 12px;
    color: var(--文本次色, #666);
    transition: all .3s;
    &:hover {background-color: var(--边框色-淡);}
    :first-child {
        height: 70%;
        aspect-ratio: 1/1;
        position: relative;
        &::after,&::before {
            content: '';
            position: absolute;
            height: 50%;
            aspect-ratio: 1/1;
            border: var(--文本次色);
            border-top: 1.5px solid;
            border-bottom: 1.5px solid;
            border-left: 1.5px solid;
            border-right: 1.5px solid;
            border-radius: 0px;
            transition: all .3s;
        }
        &::before{
            top: 15%;
            left: 40%;
            border-bottom: none;
            border-left: none;
        }
        &::after {
            bottom: 5%;
            right: 20%;
        }
    }
    &[title="Acrylic亮色"] > :first-child {}
    &[title="Acrylic暗色"] > :first-child {
        &::after {
            background-color: var(--主题色);
        }
    }
    &[title="Mica亮色"] > :first-child {
        &::before {
            border-radius: 3px;
        }
        &::after {
            right: 22%;
            backdrop-filter: blur(10px);
            border-radius: 3px;
        }
    }
    &[title="Mica暗色"] > :first-child {
        &::before {
            border-radius: 3px;
        }
        &::after {
            right: 22%;
            background-color: var(--主题色);
            border-radius: 3px;
        }
    }
}

.系统控件 {
    display: flex;
    align-items: center;
    height: 100%;
    margin-left: auto;
}

.按钮 {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 46px;
    height: 100%;
    color: var(--文本次色, #666);
    transition: background-color .12s, color .12s;
    cursor: pointer;

    &:hover {
        background-color: rgba(0, 0, 0, .06);
        color: var(--文本主色, #333);
    }

    &:active {
        background-color: rgba(0, 0, 0, .1);
    }
}

.关闭 {
    &:hover {
        background-color: #c42b1c;
        color: #fff;
    }

    &:active {
        background-color: #b22a1c;
        color: #fff;
    }
}

</style>
