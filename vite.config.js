import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@js-temporal/')) return 'temporal'
          if (id.includes('node_modules/lunar-javascript/')) return 'lunar'
          if (id.includes('node_modules/@arco-design/')) return 'arco'
        }
      }
    }
  }
})
