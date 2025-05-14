<template>
    <div class="tool-bar">
        <div
            @click="downloadSvg"
            class="exportDiv"
        >
            导出数据
        </div>
        <!-- <img class="icon" :src="downloadSvgIcon" alt="download" @click="downloadSvg" style="margin-bottom: 10px;"> -->
        <InputFile></InputFile>
    </div>
</template>

<script setup>
import downloadSvgIcon from '@/assets/download.svg'
import InputFile from '@/components/inputFile.vue';
import { inject } from 'vue'
import { useStoreData, useStoreState } from '@/stores/index.js';
const state = useStoreState;
const emitter = inject('emitter')

const downloadSvg = function(){
    state.isExport = true;
    emitter.emit('downloadSvg')
}

</script>

<style scoped>
.tool-bar {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 300px;
    height: 500px;
    position: relative;
}


.exportDiv{
    width: 150px; 
    height: 35px; 
    display: flex;
    align-items: center;
    justify-content: center;
    /* line-height: 50px;  */
    background: rgba(201, 201, 201, 0.7); 
    color: black; 
    text-align: center; 
    cursor: pointer;
    margin-bottom: 15px;
}
.icon{
    width: 30px;
    height: 30px;
}
</style>