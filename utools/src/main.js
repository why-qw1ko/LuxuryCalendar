import { createApp, h, ref } from 'vue'
import App from './App.vue'
import { registerUtoolsLifecycle } from './lib/utools'
import '@arco-design/web-vue/es/alert/style/css.js'
import '@arco-design/web-vue/es/color-picker/style/css.js'
import '@arco-design/web-vue/es/message/style/css.js'
import '@arco-design/web-vue/es/modal/style/css.js'
import '@arco-design/web-vue/es/select/style/css.js'
import '@arco-design/web-vue/es/spin/style/css.js'
import '@arco-design/web-vue/es/switch/style/css.js'
import '@arco-design/web-vue/es/tag/style/css.js'
import './style.css'

const active = ref(!window.utools)
registerUtoolsLifecycle(window.utools, value => { active.value = value })

createApp({ render: () => active.value ? h(App) : null }).mount('#app')
