import { createApp } from 'vue'

import App from '@/App.vue'
import '@/assets/main.css'
import { registerPreviewCodicons } from '@/utils/registerCodicons'

registerPreviewCodicons()

createApp(App).mount('#app')
