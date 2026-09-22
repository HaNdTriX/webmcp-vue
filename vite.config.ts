/// <reference types="vitest/config" />
import vue from '@vitejs/plugin-vue'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vite'

export default defineConfig({
  root: './playground',
  // GitHub Pages serves the repo under /webmcp-vue/, so only the build needs the sub-path base.
  base: process.env.GITHUB_ACTIONS ? '/webmcp-vue/' : '/',
  plugins: [vue()],
  test: {
    root: '.',
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
      headless: true,
    },
  },
})
