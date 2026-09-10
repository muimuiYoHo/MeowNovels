<template>
    <div class="控制台">
        <SetCategory :激活分类="激活分类" @选择分类="处理选择分类" />
        <div class="分类的设置">
            <transition :name="过渡名称" mode="out-in">
                <component :is="当前设置组件" :key="当前分类" />
            </transition>
        </div>
    </div>
</template>

<script>
import SetCategory from './设置分类.vue';
import Basic from './基本设置.vue';
import Appearance from './外观设置.vue';
export default {
  components: {
    SetCategory,
    Basic,
    Appearance
  },
  data() {
    return {
      当前分类: '基本',
      激活分类: '',
      过渡名称: 'slide-up',
      分类顺序: ['基本', '外观']
    };
  },
  computed: {
    当前设置组件() {
      const mapping = {
        基本: 'Basic',
        外观: 'Appearance',
      };
      return mapping[this.当前分类] || 'Basic';
    }
  },
  methods: {
    处理选择分类(分类名称) {
      const oldIndex = this.分类顺序.indexOf(this.当前分类);
      const newIndex = this.分类顺序.indexOf(分类名称);
      this.过渡名称 = newIndex > oldIndex ? 'slide-up' : 'slide-down';
      this.当前分类 = 分类名称;
    }
  }
};
</script>

<style lang="scss" scoped>
.控制台 {
    display: flex;
    position: relative;
    top: 0;
    left: 0;
    flex-wrap: wrap;
    gap: 1%;
    align-content: space-between;
    justify-content: space-between;
    width: calc(100% - 0rem);
    height: calc(100% - 0rem);
}
.分类的设置 {
    position: relative;
    flex-grow: 1;
    height: 100%;
    user-select: none;
}
.slide-up-enter-active,
.slide-up-leave-active,
.slide-down-enter-active,
.slide-down-leave-active {
    position: absolute;
    // inset: 0;
    transition: all .25s ease;
}
.slide-up-enter-from,
.slide-down-leave-to {
    transform: translateY(30%);
    opacity: 0;
}
.slide-up-enter-to,
.slide-down-leave-from {
    transform: translateY(0);
    opacity: 1;
}
.slide-up-leave-from,
.slide-down-enter-to {
    transform: translateY(0);
    opacity: 1;
}
.slide-up-leave-to {
    transform: translateY(-30%);
    opacity: 0;
}
.slide-down-enter-from {
    transform: translateY(-30%);
    opacity: 0;
}
.slide-down-enter-to {
    transform: translateY(0);
    opacity: 1;
}
.slide-down-leave-from {
    transform: translateY(0);
    opacity: 1;
}
.slide-down-leave-to {
    transform: translateY(30%);
    opacity: 0;
}
</style>