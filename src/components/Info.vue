<template>
    <Transition name="slide">
        <div class="reminder" v-if="show">
            <p class="reminder-info" v-html="htmlInfo"></p>
            <div v-if="mapClick" style="padding: 8px 0px">
                请在地图上选择实体位置
                <br>
                <span style="font-weight: bolder; color: brown;">单击</span>添加一个实体
                <br>
                当前坐标： X:{{ state.mousePositionOnMap[0].toFixed(0) }}px Y:{{ state.mousePositionOnMap[1].toFixed(0) }}px
                <br>
                <span style="font-weight: bolder; color: brown;">回车</span>结束添加
            </div>
        </div>
    </Transition>

</template>

<script setup>
import { useStoreState } from "@/stores";
import { ref, onMounted, inject } from 'vue';
const emitter = inject('emitter');
const state = useStoreState();

const show = ref(false);
const htmlInfo = ref("");
const mapClick = ref(false);
emitter.on('showInfo', (html) => {
    htmlInfo.value = html;
    show.value = true;
})
emitter.on('showInfo_MapClick', () => {
    mapClick.value = true;
    show.value = true;
})
emitter.on('closeInfo', () => {
    show.value = false;
    htmlInfo.value = "";
    mapClick.value = false;
})
</script>

<style scoped>
.reminder {
    width: 20vw;
    height: 10vh;
    min-height: fit-content;
    position: absolute;
    left: 40vw;
    top: 0vh;
    border-radius: 0 0 10px 10px;
    background-color: #fff;
    border: 1px solid #ccc;
    border-top: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}

.reminder .reminder-info {
    font-size: 14px;
    font-weight: bold;
}

.slide-enter-active,
.slide-leave-active {
    transition: top 0.5s ease;
}

.slide-enter-from,
.slide-leave-to {
    top: -10vh;
}
</style>