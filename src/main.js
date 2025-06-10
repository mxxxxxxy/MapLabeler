import { createApp } from 'vue'
import './style.css'
import 'font-awesome/css/font-awesome.min.css';
import App from './App.vue'
import { createPinia } from 'pinia';
import mitt from 'mitt';
const emitter = mitt()
const pinia = createPinia();
const app = createApp(App)
app.provide('emitter', emitter);
app.use(pinia).mount('#app');
