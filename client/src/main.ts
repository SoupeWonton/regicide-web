import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import Home from './components/Home.vue'
import Room from './components/Room.vue'
import Sandbox from './components/Sandbox.vue'
import './style.css'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/room/:code', component: Room },
    { path: '/sandbox', component: Sandbox },
  ],
})

createApp(App).use(router).mount('#app')
