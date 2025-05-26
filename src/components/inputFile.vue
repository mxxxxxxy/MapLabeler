<template>
    <div>
        <div @click="triggerUpload">
            上传数据
        </div>
        <input type="file" accept=".json" ref="fileInput" style="display: none" @change="onFileChange" />
    </div>
</template>

<script setup>
import { ref, computed, useTemplateRef } from 'vue';
import { useStoreData, useStoreState } from '@/stores/index.js';
const data = useStoreData();
const state = useStoreState();
var jsonContent = null;
const fileInput = useTemplateRef('fileInput');

function triggerUpload() {
    fileInput.value.click();
}
function onFileChange(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            jsonContent = JSON.parse(e.target.result);
            data.uploadedData = jsonContent;
            state.isUpload = true;
            // setTimeout(()=>{
            //     state.isUpload = false;
            // })
        } catch (err) {
            alert('文件不是合法的 JSON 格式！');
            jsonContent = null;
        }
    };
    reader.readAsText(file);
}

</script>


<style scoped>
.uploadDiv {
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
}
</style>