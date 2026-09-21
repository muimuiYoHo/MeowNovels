<template>
    <div class="a">
        <h2>基础</h2>
        <p>关于软件的基本设置</p>
        <hr>
        <div class="控件区">
            <XZbuttom v-for="(项, 索引) in 设置列表" :key="项.id" :激活状态="项.值" :按钮文本="项.内容" :可以点击="索引 !== 0" @click="切换状态(索引)"/>
        </div>
    </div>
</template>

<script>
import XZbuttom from './UI/选择按钮.vue';
import { 发送系统通知 } from '../方法/系统通知.js';
import { 读取设置, 更新设置 } from '../方法/更新设置.js';

export default {
  components: { XZbuttom },
  data() {
    return {
      设置列表: []
    }
  },
  emits: ['状态变更'],
  async mounted() {
    this.设置列表 = await 读取设置('基础设置');
  },
  methods: {
    async 切换状态(索引) {
      const 项 = this.设置列表[索引];
      const 新状态 = !项.值;
      this.设置列表 = await 更新设置('基础设置', 项.id, 新状态);
      this.$emit('状态变更', this.设置列表);
      发送系统通知('基础设置更新了喵', `${项.内容} -> ${新状态 ? '开启喵' : '关闭喵'}`);
    }
  }
}
</script>

<style lang="scss" scoped>
.a {
    position: relative;
    top: 0;
    left: 0;
    border-radius: 10px;
    width: calc(100% - 2rem);
    padding: 1rem;
    background-color: var(--通用背景色-2);
    h2 {
        color: var(--文本主色);
    }
    p {
        color: var(--文本次色);
        font-size: .9rem;
    }
    hr {
        border: none;
        height: .5px;
        margin: .4rem 0;
        background-color: gray;
    }
    .控件区 {
        width: 100%;
        height: auto;
        display: flex;
        gap: 1rem;
        flex-direction: column;
    }
}
</style>