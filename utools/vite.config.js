import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// uTools loads index.html from disk; a classic single-file script also works under file://.
function classicScript() {
  return {
    name: 'utools-classic-script',
    transformIndexHtml(html) {
      return html
        .replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/, '<script defer src="$1"></script>')
        .replace(/(<link rel="stylesheet") crossorigin/g, '$1')
    }
  }
}

export default defineConfig({
  base: './',
  plugins: [vue(), classicScript()],
  build: {
    modulePreload: false,
    cssCodeSplit: false,
    rollupOptions: {
      output: { format: 'iife', inlineDynamicImports: true }
    }
  }
})
