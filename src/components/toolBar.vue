<template>
    <div class="tool-bar">
        <img class="icon" :src="downloadSvgIcon" alt="download" @click="downloadSvg">
    </div>
</template>

<script setup>
import downloadSvgIcon from '@/assets/download.svg'
import { inject } from 'vue'
const emitter = inject('emitter')

const downloadSvg = function(){
    emitter.emit('downloadSvg')
}

</script>

<style scoped>
.tool-bar {
    display: flex;
    width: 300px;
    height: 50px;
    position: relative;
}

.icon{
    width: 30px;
    height: 30px;
}
</style>