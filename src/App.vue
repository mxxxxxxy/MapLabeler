<template>
    <div class="root-div">
      <span class = "title" style="position: absolute; top: 0; left: 0; z-index: 1;">
        古代地理空间主题地图
      </span>
      <SvgPlotter
        :height = "height"
        :width = "width/2"
        :left = "width/4"
        :top = "0"
      />
      <div class="toolbar">
        <toolBar> </toolBar>
      </div>
      <LayerManager
        :height = "height*0.85"
        :width = "width/5"
        :left = "width/100"
        :top = "height/10"
      />
      <Info></Info>
    </div>
</template>

<script setup>
import TangData from '@/assets/TangData.json';
import SvgPlotter from './components/SvgPlotter.vue';
import LayerManager from './components/LayerManager.vue';
import Info from './components/Info.vue';
import { useStoreData, useStoreState } from './stores/index.js';
import { ref } from 'vue';
import toolBar from './components/toolBar.vue';
// ------

const data = useStoreData();
const state = useStoreState();
// TangData
const assignLabelById = (arr) => {
  arr.forEach( (d) => {
    d.label = d.id
  })
}
data.layers.water = TangData['水系'];
data.layers.wall = TangData['城墙'];
data.layers.building = TangData['城坊'];
data.layers.door = TangData['城门'];
data.layers.road = TangData['道路'];
state.addLayerVisibility(['baseMap','water', 'wall', 'building', 'door', 'road']);
assignLabelById(data.layers.water);
assignLabelById(data.layers.wall);
assignLabelById(data.layers.building);
assignLabelById(data.layers.door);
assignLabelById(data.layers.road);

const height = ref(window.innerHeight);
const width = ref(window.innerWidth);

window.addEventListener('resize', () => {
  height.value = window.innerHeight;
  width.value = window.innerWidth;
});

</script>

<style scoped>
.title {
  font-size: 2em;
  padding: 10px;
  font-weight: bold;
  color: #333;
}
.toolbar{
    position: absolute;
    top: 10%;
    right: 0px;
}
.root-div{
    width: 100vw; 
    height: 100vh; 
    overflow: hidden; 
    background-image: url(/background.png);
}

</style>
