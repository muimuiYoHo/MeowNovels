<template>
    <div class="app-android" data-platform="android">
        <div
            class="内容区"
            @pointerdown="按下"
            @pointermove="移动"
            @pointerup="抬起"
            @pointercancel="取消"
        >
            <div class="滑动轨道" :class="{ 拖动中 }" :style="轨道样式">
                <div class="页"><SearchPage /></div>
                <div class="页"><ResourcesPage /></div>
                <div class="页"><SettingsPage /></div>
            </div>
        </div>
        <NavigationBar :当前="当前页" @切换="切到" />
    </div>
</template>

<script>
import NavigationBar from "./组件/UI/导航栏.android.vue";
import SearchPage from "./组件/页面/搜索.android.vue";
import ResourcesPage from "./组件/页面/资源.android.vue";
import SettingsPage from "./组件/页面/设置.android.vue";

const 页数 = 3;
const 方向判定 = 8;
const 翻页比例 = 0.22;
const 翻页速度 = 0.4;
const 边界阻尼 = 0.35;

export default {
    name: "AppAndroid",
    components: { NavigationBar, SearchPage, ResourcesPage, SettingsPage },
    data() {
        return {
            当前页: 0,
            拖动位移: 0,
            拖动中: false,
            指针id: null,
            起始x: 0,
            起始y: 0,
            方向: null,
            最后x: 0,
            最后时刻: 0,
            速度: 0,
        };
    },
    computed: {
        轨道样式() {
            const 基准 = (-this.当前页 * 100) / 页数;
            return {
                transform: "translate3d(calc(" + 基准 + "% + " + this.拖动位移 + "px), 0, 0)",
            };
        },
    },
    methods: {
        按下(事件) {
            if (事件.pointerType === "mouse" && 事件.button !== 0) return;
            this.指针id = 事件.pointerId;
            this.起始x = 事件.clientX;
            this.起始y = 事件.clientY;
            this.最后x = 事件.clientX;
            this.最后时刻 = performance.now();
            this.速度 = 0;
            this.方向 = null;
            this.拖动中 = false;
            this.拖动位移 = 0;
            if (事件.currentTarget.setPointerCapture) {
                事件.currentTarget.setPointerCapture(事件.pointerId);
            }
        },
        移动(事件) {
            if (事件.pointerId !== this.指针id) return;
            if (this.方向 === "纵向") return;

            const 横移 = 事件.clientX - this.起始x;
            const 纵移 = 事件.clientY - this.起始y;

            if (!this.方向) {
                if (Math.abs(横移) < 方向判定 && Math.abs(纵移) < 方向判定) return;
                this.方向 = Math.abs(横移) > Math.abs(纵移) ? "横向" : "纵向";
                if (this.方向 === "纵向") return;
                this.拖动中 = true;
            }

            const 现在 = performance.now();
            const 间隔 = 现在 - this.最后时刻;
            if (间隔 > 0) this.速度 = (事件.clientX - this.最后x) / 间隔;
            this.最后x = 事件.clientX;
            this.最后时刻 = 现在;

            let 位移 = 横移;
            const 越界 =
                (this.当前页 === 0 && 位移 > 0) ||
                (this.当前页 === 页数 - 1 && 位移 < 0);
            if (越界) 位移 *= 边界阻尼;
            this.拖动位移 = 位移;
        },
        抬起(事件) {
            if (事件.pointerId !== this.指针id) return;
            this.结算();
        },
        取消() {
            this.指针id = null;
            this.复位();
        },
        结算() {
            const 曾拖动 = this.拖动中;
            this.指针id = null;
            if (!曾拖动) return;

            const 容器宽 = (this.$el && this.$el.clientWidth) || 360;
            const 阈值 = 容器宽 * 翻页比例;
            const 位移 = this.拖动位移;
            const 速度 = this.速度;

            let 目标 = this.当前页;
            if (位移 < -阈值 || (位移 <= 0 && 速度 < -翻页速度)) 目标 = this.当前页 + 1;
            else if (位移 > 阈值 || (位移 >= 0 && 速度 > 翻页速度)) 目标 = this.当前页 - 1;
            目标 = Math.min(页数 - 1, Math.max(0, 目标));

            this.复位();
            this.当前页 = 目标;
        },
        复位() {
            this.拖动中 = false;
            this.拖动位移 = 0;
            this.方向 = null;
        },
        切到(索引) {
            this.指针id = null;
            this.复位();
            this.当前页 = 索引;
        },
    },
};
</script>

<style scoped>
/* 扁平 CSS：避免 SCSS 嵌套在部分 WebView 上丢规则导致三页竖排 */
.app-android {
    position: relative;
    height: 100%;
    width: 100%;
    overflow: hidden;
    background-color: var(--页面底色, #f5f7f9);
    user-select: none;
    -webkit-user-select: none;
}
.内容区 {
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    overflow: hidden;
    touch-action: pan-y;
}
.滑动轨道 {
    display: -webkit-flex;
    display: flex;
    flex-direction: row;
    align-items: stretch;
    width: 300%;
    height: 100%;
    transition: transform 0.3s cubic-bezier(0.22, 0.61, 0.36, 1);
    will-change: transform;
}
.滑动轨道.拖动中 {
    transition: none;
}
.页 {
    position: relative;
    box-sizing: border-box;
    width: calc(100% / 3);
    height: 100%;
    flex: 0 0 calc(100% / 3);
    overflow: hidden;
}
</style>
