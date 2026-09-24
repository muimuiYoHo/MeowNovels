<template>
  <div class="app-android" data-platform="android">
    <header class="top">喵小说 · Android 壳（按 UI原型/android 重写）</header>
    <main class="body">
      <p>平台后缀已就位：<code>*.android.*</code> / <code>*.share.*</code></p>
      <p>此处用新写页面替换，不移植 PC 的 Vue 树。</p>
    </main>
    <nav class="tabs">
      <span>搜索</span><span>资源</span><span>设置</span>
    </nav>
  </div>
</template>

<script>
export default { name: "AppAndroid" };
</script>

<style scoped>
.app-android {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}
.top { padding: 12px 16px; font-weight: 600; color: var(--brand); }
.body { flex: 1; padding: 16px; line-height: 1.7; }
.tabs {
  display: flex;
  justify-content: space-around;
  padding: 10px 0 16px;
  border-top: 1px solid #e5e7ef;
}
</style>
