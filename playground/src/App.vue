<script setup lang="ts">
import { WebMCPProvider } from '../../src'
import CalculatorTool from './CalculatorTool.vue'
import CounterTool from './CounterTool.vue'
import GreetingTool from './GreetingTool.vue'
import WaitTool from './WaitTool.vue'
</script>

<template>
  <WebMCPProvider name="webmcp-vue-playground" version="1.0.0">
    <main class="app">
      <section class="hero" aria-labelledby="page-title">
        <p class="eyebrow">webmcp-vue playground</p>
        <h1 id="page-title">Callable Vue tools</h1>
        <p class="intro">
          This page registers four tools on <code>document.modelContext</code>: a read-only
          greeting, a calculator with a structured result, a state-mutating counter, and a
          cancellable wait. Call any of them from an agent or try them locally below.
        </p>
      </section>

      <GreetingTool />
      <CalculatorTool />
      <CounterTool />
      <WaitTool />
    </main>
  </WebMCPProvider>
</template>
