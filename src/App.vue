<script setup>
// import GengmaData_zh from './components/GengmaData_zh.js';
import PKUData from './components/PKUData.js';
import TangData from './components/TangData.json';
import DSLManager from './components/DSLManager.vue';
import SvgPlotter from './components/SvgPlotter.vue';
import LayerManager from './components/LayerManager.vue';
import { useStoreData } from './stores/index.js';
import { ref } from 'vue';

const data = useStoreData();
data.pointCoordinates = PKUData.pointCoordinates;
data.pathData = PKUData.pathCoordinates;
data.areaCoordinates = PKUData.areaCoordinates;

data.water = TangData['水系'];
data.wall = TangData['城墙'];
data.building = TangData['城坊'];
data.door = TangData['城门'];
data.road = TangData['道路'];

const height = ref(window.innerHeight);
const width = ref(window.innerWidth);

window.addEventListener('resize', () => {
  height.value = window.innerHeight;
  width.value = window.innerWidth;
});

</script>

<template>
    <div style="width: 100vw; height: 100vh; overflow: hidden;">
      <span class = "title" style="position: absolute; top: 0; left: 0; z-index: 1;">
        地图标注系统
      </span>
      <SvgPlotter
        :height = "height"
        :width = "width/2"
        :left = "width/4"
        :top = "0"
      />
      <!-- <DSLManager
        :height = "height*0.85"
        :width = "width/5"
        :right = "width/100"
        :top = "height/10"
      /> -->
      <LayerManager
        :height = "height*0.85"
        :width = "width/5"
        :left = "width/100"
        :top = "height/10"
      />
    </div>
</template>

<style scoped>
.title {
  font-size: 2em;
  padding: 10px;
  font-weight: bold;
  color: #333;
}
</style>
