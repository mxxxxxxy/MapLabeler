import { createApp } from 'vue'
import './style.css'
import 'font-awesome/css/font-awesome.min.css';
import App from './App.vue'
import { createPinia } from 'pinia';

createApp(App)
.use(createPinia())
.mount('#app')