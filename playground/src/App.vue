<script setup lang="ts">
import { WebMCPProvider } from '../../src'
import GreetingTool from './GreetingTool.vue'
</script>

<template>
  <WebMCPProvider name="webmcp-vue-playground" version="1.0.0">
    <main class="app">
      <section class="hero" aria-labelledby="page-title">
        <p class="eyebrow">webmcp-vue playground</p>
        <h1 id="page-title">A callable Vue tool</h1>
        <p class="intro">
          This page registers <code>greet</code> on <code>document.modelContext</code>.
          Call it from an agent or try it locally below.
        </p>
      </section>

      <GreetingTool />
    </main>
  </WebMCPProvider>
</template>
