<template>
    <div class="tool-bar">
        <div @click="downloadSvg" class="btn">导出数据</div>
        <InputFile class="btn"></InputFile>
        <div class="btn" @click="switch_data">切换数据</div>
    </div>
</template>

<script setup>
import downloadSvgIcon from '@/assets/download.svg'
import InputFile from '@/components/inputFile.vue';
import { inject } from 'vue'
import { useStoreData, useStoreState } from '@/stores/index.js';
const state = useStoreState();
const emitter = inject('emitter')

const downloadSvg = function () {
    state.isExport = true;
    emitter.emit('downloadSvg')
}

const switch_data = function () {
    const isConfirm = window.confirm("请确认已经保存修改的标注内容，切换后将丢失未保存的修改！");
    if(isConfirm){
        state.usedDataName = state.usedDataName === 'Changan' ? 'QuanTang' : 'Changan';
    }
}

</script>


<style>
.btn {
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

</style>

<style scoped>
.tool-bar {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: fit-content;
    height: fit-content;
    position: relative;
}



.icon {
    width: 30px;
    height: 30px;
}
</style>