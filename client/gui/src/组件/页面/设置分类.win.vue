<template>
    <div class="任务">
        <div class="任务列表" @click="处理点击">
            <div class="任务项 激活任务" 可点击 data-任务名称="基本">基本<div></div></div>
            <div v-for="任务 in 支持的任务" :key="任务.任务名称" class="任务项" 可点击 :data-任务名称="任务.任务名称">{{ 任务.任务名称 }} <div></div></div>
        </div>
    </div>
</template>

<script>
export default {
  props: {
    激活分类: {
      type: String,
      default: '基本'
    }
  },
  emits: ['选择分类'],
  data() {
    return {
      支持的任务: [{ 任务名称: '外观' }]
    };
  },
  methods: {
    处理点击(事件) {
      const 任务项 = 事件.target.closest('.任务项');
      if (!任务项 || !任务项.hasAttribute('可点击')) return;
      const 被点击任务 = 任务项.dataset.任务名称;
      if (!任务项.hasAttribute('任务进程锁定')) document.querySelector('.任务列表').querySelectorAll('.激活任务').forEach(喵喵喵 => {喵喵喵.classList.remove('激活任务');});
      任务项.classList.add('激活任务');
      this.$emit('选择分类', 被点击任务);
      console.log(`点击 ${被点击任务} 任务`);
    }
  }
};
</script>

<style lang="scss" scoped>
.任务 {
    position: relative;
    width: 15%;
    min-width: 150px;
    max-width: 170px;
    height: 100%;
    border-radius: 10px;
    background-color: var(--通用背景色-2);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all .3s;
    .任务列表 {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: .5rem;
    }
    .任务项 {
        position: relative;
        display: flex;
        align-items: center;
        width: 60%;
        height: 30px;
        padding-left: 30%;
        border-radius: 8px;
        border: 1px solid rgba(0, 0, 0, 0);
        overflow: hidden;
        transition: all .3s;
        user-select: none;
        color: var(--文本次色);
        &::before {
            content: '';
            position: absolute;
            left: 4%;
            transform: translateY(-50%);
            top: 50%;
            height: 70%;
            border-radius: 5px;
            aspect-ratio: 1 / 1;
            border: 1px solid var(--边框色-淡);
            background-color: rgba(0, 0, 0, .1);
            transition: all .3s;
        }
        &::after {
            content: '';
            position: absolute;
            color: #ffffff;
            left: 7%;
            transform: translateY(-50%);
            top: 50%;
            font-size: 1.2rem;
        }
        &:hover {
            color: var(--文本主色);
            border-color: rgba(0, 0, 0, .3);
            > div { &::after {top: 0;}}
        }
        > div {
            &::after {
                content: '';
                position: absolute;
                left: 0;
                top: 100%;
                width: 100%;
                height: 100%;
                opacity: .8;
                background-color: var(--边框色-淡);
                transition: all .3s;
                z-index: -2;
            }
            &::before {
                content: '';
                position: absolute;
                left: -100%;
                top: 0;
                width: 100%;
                height: 100%;
                opacity: .5;
                transition: all .3s;
                z-index: -1;
            }
        }
    }
    .激活任务 {
        color: var(--文本主色) ;
        &::before {background-color: var(--成功色);}
        &::after {content: '\2713';}
        > div {&::after {opacity: 0;}}
    }
    .任务完成 {> div {&::before {left: 0;background-color: var(--成功色-任务);}}}
    .任务异常 {
        &::before {background-color: var(--错误色);}
        &::after {content: '✗';left: 6%;}
        > div {&::before {left: 0;background-color: var(--错误色-任务);}}
    }
}

</style>
