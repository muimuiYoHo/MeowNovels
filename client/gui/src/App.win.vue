<script>
import { invoke } from "@tauri-apps/api/core";
import TitleBar from './组件/子页面/标题栏';
import Console from './组件/子页面/控制台';
import Home from './组件/页面/首页';
import Dashboard from './组件/图标/仪表盘';
import Schedule from './组件/图标/时间计划';
import AboutMe from './组件/图标/注意';
import Star from './组件/图标/收藏';
import HomeIcon from './组件/图标/首页';
import Settings from './组件/图标/齿轮';
let 按键历史 = [];

export default {
  components: {
    Console,
    Dashboard,
    Schedule,
    AboutMe,
    Star,
    HomeIcon,
    Settings,
    // Home,
    TitleBar
  },
  data() {
    return {
      要展开吗: false,
      窗口已最大化: false
    };
  },
  methods: {
    处理键盘事件(事件) {
      if (事件.key.toLowerCase() === 'm') {
        const 现在 = Date.now();
        按键历史.push(现在);
        按键历史 = 按键历史.filter(时间 => 现在 - 时间 < 5000);
        if (按键历史.length >= 3) {
          按键历史 = [];
          this.打开调试窗口();
        }
      }
    },
    async 打开调试窗口() {
      try {
        await invoke('打开调试窗口');
      } catch (错误) {
        console.error('打开调试窗口失败:', 错误);
      }
    }
  },
  async mounted() {
    window.addEventListener('keydown', this.处理键盘事件);

    // 获取系统主题色并转HSL
    try {
      const hex = await invoke('获取系统主题色');
      if (hex) {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;
        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
          }
        }
        const H = Math.round(h * 360);
        const S = Math.round(s * 100);
        const L = Math.round(l * 100);
        const root = document.documentElement.style;
        root.setProperty('--主题色-h', H);
        root.setProperty('--主题色-s', S);
        root.setProperty('--主题色-l', L);
        root.setProperty('--主题色', `hsl(${H}, ${S}%, ${L}%)`);
      }
    } catch (错误) {
      console.error('获取主题色失败:', 错误);
    }
  },
  unmounted() {
    window.removeEventListener('keydown', this.处理键盘事件);
  }
};
</script>

<template>
    <div class="app-main">
        <TitleBar @最大化状态变化="窗口已最大化 = $event"></TitleBar>
        <div class="内容区">
            <div id="左" :class="{ '展开': 要展开吗 }">
                <div class="侧边栏开关" @click="要展开吗 = !要展开吗">&#9776;</div>
                <div 目的地="首页" 当前位置><HomeIcon class="icon"/>首页 | 搜索</div>
                <div 目的地="收藏"><star class="icon"/>收藏</div>
                <div 目的地="资源"><Schedule class="icon"/>资源</div>
                <div 目的地="设置"><Settings class="icon"/>设置</div>
                <div 目的地="关于"><AboutMe class="icon"/>关于</div>
            </div>
            <div id="右">
                <Home class="滚动条我说了算"/>
                <Console />
            </div> 
        </div>
    </div>
</template>

<style lang="scss" scoped>
.app-main {
    display: flex;
    flex-direction: column;
    height: 100vh;
}
.内容区 {
    display: flex;
    width: calc(100% - 5px);
    height: calc(100% - 37px);
    > div {
        position: relative;
        transition: all .3s;
        // background-color: var(--透明背景);
    }
}
.侧边栏开关 {
    position: absolute;
    top: 0;
    left: 0;
    width: 30px;
    height: 30px;
    font-size: 1.5rem;
    cursor: pointer;
    user-select: none;
    color: var(--文本次色)!important;
    transition: all .3s;
    display: flex;
    justify-content: center;
    align-items: center;
    &:active {
        color: var(--文本主色) !important;
        transform: scaleX(.7) !important;
    }
}
#左 {
    width: 3rem;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: start;
    gap: .8rem;
    transition: all .3s;
    // overflow: hidden;
    div[当前位置] {.icon {color: var(--主题色);}}
    > div {
        display: flex;
        align-items: center;
        gap: 1.2rem;
        white-space: nowrap;
        color: transparent;
        transition: all .3s;
        user-select: none;
        &:hover {.icon { color: var(--强调色)!important;}}
        .icon { 
            position: relative;
            transform: scale(.8);
            margin-left: .5rem;
            font-size: 2rem;
            color: var(--文本次色);
            transition: all .3s;
        }
    }
}
#右 {
    flex-grow: 1;
    max-width: calc(100% - 3rem);
    height: calc(100% - 3px);
    overflow: hidden;
    // overflow-y: auto;
    border-radius: 10px;
    border: var(--边框色-淡) 1.5px solid;
}
.展开 {
    width: 170px !important;
    > div {
        z-index: 5;
        color: var(--文本主色)!important;
        gap: .7rem !important;
        &:not(:first-child):hover{color: var(--强调色)!important;}
    }
}
.滚动条我说了算 {
    height: 100%;
    > *:first-child {
        overflow-y: auto;
        /* 整体 */
        &::-webkit-scrollbar {
            width: 4px;
        }
        /* 轨道 */
        &::-webkit-scrollbar-track {
            // background: var(--边框色-淡);
            background: transparent;
            border-radius: 0px;
        }
        /* 滑块 */
        &::-webkit-scrollbar-thumb {
            background: var(--主题色);
            border-radius: 0px;
        }
        /* 悬停 */
        &::-webkit-scrollbar-thumb:hover {
            background: var(--强调色);
        }
    }
}
</style>

<style>
* {
    margin: 0;
}
ul,li,div,a {  
    list-style: none;  
    line-height: normal;
    text-decoration: none;
}
div {
    padding: 0;
}
html {
  background: transparent;
  margin: 0;
  overflow: hidden;
}
body {
    width: 100vw;
    height: 100vh;
    background-color: rgba(255, 255, 255, 0);
}

</style>
