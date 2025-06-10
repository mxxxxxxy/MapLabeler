// mouse.js
import { ref, onMounted, onUnmounted } from 'vue'

export function useMouse() {
    const mouseX = ref(0)
    const mouseY = ref(0)

    // 组合式函数可以随时更改其状态。
    function update(event) {
        // console.log(event)
        mouseX.value = event.clientX
        mouseY.value = event.clientY
    }

    onMounted(() => window.addEventListener('mousemove', update))
    onUnmounted(() => window.removeEventListener('mousemove', update))

    return { mouseX, mouseY }
}