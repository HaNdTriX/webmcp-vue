<script setup lang="ts">
import { useWebMCPProvider } from './context'
import type { WebMCPProviderProps } from './types'

defineProps<WebMCPProviderProps>()

useWebMCPProvider()
</script>

<template>
  <slot />
</template>
