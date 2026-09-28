<template>
    <!-- 类名按 `类型` 拼出来（提示弹窗 / 确认弹窗 / 操作弹窗）——
         这样三类在 DOM 上一眼能区分，样式也各自独立，不用靠父级加一堆修饰类。 -->
    <Transition :name="`${类型}弹窗动画`">
        <div v-if="显示" :class="`${类型}弹窗遮罩`" @click="$emit('取消')">
            <div :class="`${类型}弹窗`" @click.stop>
                <p v-if="标题" :class="`${类型}弹窗标题`">{{ 标题 }}</p>
                <!-- 内容全靠插槽：三类差别最大的就是内容（纯文字 / 表单 / 名值行），
                     组件只负责壳子。插槽内容落在**使用方的作用域**里，所以
                     使用方的 scoped 样式照样能选中它们。 -->
                <slot />
                <div :class="`${类型}弹窗按钮`">
                    <button v-if="类型 !== '提示'" class="取消" @click="$emit('取消')">{{ 取消文字 }}</button>
                    <button :class="危险 ? '危险' : '确认'" @click="$emit('确认')">{{ 确认文字 }}</button>
                </div>
            </div>
        </div>
    </Transition>
</template>

<script>
// 通用弹窗，三类语义：
//
//   提示弹窗（类型="提示"）—— 只告知，**没有取消**，居中浮在屏幕中间、缩放进出。
//                              确认钮的文字一般传「知道了」。
//   确认弹窗（类型="确认"）—— 问「要不要继续」，贴底升起、取消 + 确认。
//                              不可逆的操作把 `危险` 打开 → 确认钮变红。
//   操作弹窗（类型="操作"）—— 带输入/表单的那种，贴底升起、取消 + 提交。
//
// 三类的**落点**和**进出动画**是刻意不同的：提示是「打断你一下」，从中间弹出来才有那个意思；
// 确认/操作是「要你做决定」，从底部升起来更像抽屉、也更顺手（拇指够得到按钮）。
//
// 「点遮罩」一律等于取消 —— 提示弹窗也不例外（点一下关掉，符合直觉）。
export default {
    name: 'Dialog',
    props: {
        显示: { type: Boolean, default: false },
        // '提示' | '确认' | '操作'
        类型: { type: String, default: '确认' },
        标题: { type: String, default: '' },
        取消文字: { type: String, default: '取消' },
        确认文字: { type: String, default: '确认' },
        // 确认钮是否走「危险」配色（删东西这类不可逆操作用）
        危险: { type: Boolean, default: false },
    },
    emits: ['取消', '确认'],
};
</script>

<style scoped>
/* ───────── 遮罩：定位共用，落点各写 ───────── */
.提示弹窗遮罩,
.确认弹窗遮罩,
.操作弹窗遮罩 {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    /* 要高于标题栏的 25，否则标题栏会压在遮罩上面 */
    z-index: 30;
    display: flex;
    flex-direction: column;
    background-color: color-mix(in srgb, var(--黑) 45%, transparent);
}

/* 提示：居中浮在屏幕中间 */
.提示弹窗遮罩 {
    justify-content: center;
    padding: 0 15px;
}

/* 确认 / 操作：贴底升起（更像抽屉，按钮也在拇指够得到的地方） */
.确认弹窗遮罩,
.操作弹窗遮罩 {
    justify-content: flex-end;
}

/* ───────── 弹窗本体 ───────── */
.提示弹窗,
.确认弹窗,
.操作弹窗 {
    width: 90%;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 15px;
    border-radius: 1.5rem;
    background-color: var(--页面背景);
}
/* 贴底的这两个要给底部安全区让位，并留 15px 离屏边 */
.确认弹窗 {
    margin-bottom: max(15px, env(safe-area-inset-bottom));
}
.操作弹窗 {
    padding-bottom: calc(15px + env(safe-area-inset-bottom, 0px));
    width: 100%;
    margin-bottom: 0px;
}
/* ───────── 标题 ───────── */
.提示弹窗标题,
.确认弹窗标题,
.操作弹窗标题 {
    padding: 0 5px 5px;
    font-size: 1.3rem;
    font-weight: 500;
    color: var(--文本主色);
}

/* 提示弹窗是「打断你一下」，标题居中更像系统提示 */
.提示弹窗标题 {
    text-align: center;
}

/* ───────── 按钮组 ───────── */
.提示弹窗按钮,
.确认弹窗按钮,
.操作弹窗按钮 {
    display: flex;
    gap: 12px;
    margin-top: 5px;

    button {
        flex: 1;
        height: 3rem;
        border: none;
        border-radius: 1.5rem;
        font-size: 1.1rem;
        -webkit-tap-highlight-color: transparent;
    }
    .取消 {
        color: var(--文本次色);
        background-color: var(--中性-200);
    }
    .确认 {
        color: var(--白);
        background-color: var(--主题色);
    }
    /* 不可逆操作（登出、删除）—— 和「清空账号」确认态同一个红 */
    .危险 {
        color: var(--白);
        background-color: var(--小米红);
    }
}

/* ───────── 进出动画：提示缩放，确认/操作 从底部升起 ───────── */
.提示弹窗动画-enter-active,
.提示弹窗动画-leave-active {
    transition: opacity .3s;
    .提示弹窗 {
        transition: transform .3s cubic-bezier(0.22, 0.61, 0.36, 1);
    }
}
.提示弹窗动画-enter-from,
.提示弹窗动画-leave-to {
    opacity: 0;
    .提示弹窗 {
        transform: scale(.9);
    }
}

.确认弹窗动画-enter-active,
.确认弹窗动画-leave-active,
.操作弹窗动画-enter-active,
.操作弹窗动画-leave-active {
    transition: opacity .3s;
    .确认弹窗,
    .操作弹窗 {
        transition: transform .3s cubic-bezier(0.22, 0.61, 0.36, 1);
    }
}
.确认弹窗动画-enter-from,
.确认弹窗动画-leave-to,
.操作弹窗动画-enter-from,
.操作弹窗动画-leave-to {
    opacity: 0;
    .确认弹窗,
    .操作弹窗 {
        transform: translateY(100%);
    }
}
</style>
