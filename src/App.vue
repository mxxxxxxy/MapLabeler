<template>
  <div class="root-div">
    <span class="title" style="position: absolute; top: 0; left: 0; z-index: 1;">
      古代地理空间主题地图
    </span>
    <SvgPlotter :height="height" :width="width / 2" :left="width / 4" :top="0" />
    <div class="toolbar">
      <toolBar> </toolBar>
      <!-- <InputFile></InputFile> -->
    </div>
    <LayerManager :height="height * 0.85" :width="width / 5" :left="width / 100" :top="height / 10"
      ref="layerManager" />
    <Info></Info>
  </div>
</template>

<script setup>
import TangData from '@/assets/TangData.json';
import SvgPlotter from './components/SvgPlotter.vue';
import LayerManager from './components/LayerManager.vue';
import { exportJson } from "@/utils";
import Info from './components/Info.vue';
import { useStoreData, useStoreState } from './stores/index.js';
import { nextTick, ref, watch, useTemplateRef, toRaw, inject } from 'vue';
import toolBar from './components/toolBar.vue';
// ------
const emitter = inject('emitter');

const layerManagerComponent = useTemplateRef('layerManager');

const data = useStoreData();
const state = useStoreState();
// TangData
const assignLabelById = (arr) => {
  arr.forEach((d) => {
    d.label = d.id
  })
}
data.layers.water = TangData['水系'];
data.layers.wall = TangData['城墙'];
data.layers.building = TangData['城坊'];
data.layers.door = TangData['城门'];
data.layers.road = TangData['道路'];
state.addLayerVisibility(['baseMap', 'water', 'wall', 'building', 'door', 'road']);
assignLabelById(data.layers.water);
assignLabelById(data.layers.wall);
assignLabelById(data.layers.building);
assignLabelById(data.layers.door);
assignLabelById(data.layers.road);

const init = () => {
  if (state.isUpload) {
    Object.keys(data.uploadedData.layer).forEach(key => {
      data.layers[key] = data.uploadedData.layer[key];
    });
    assignLabelById(data.layers.water);
    assignLabelById(data.layers.wall);
    assignLabelById(data.layers.building);
    assignLabelById(data.layers.door);
    assignLabelById(data.layers.road);
    state.addLayerVisibility(data.userAddKeys);
    layerManagerComponent.value.layers = data.getLayers().value;
    layerManagerComponent.value.editDataDict = data.uploadedData.editDataDict;
    // 逻辑组中需要重新找到set和sequence中的html元素
    // 需要等待更新layer之后再添加，因为如果逻辑组中存在用户自定义的layer元素，直接添加找不到。
    nextTick(() => {
      data.uploadedData.logic.forEach((d, i, arr) => {
        d.sequence.forEach((_) => {
          _.ele = document.getElementById(_.id);
        })
        d.set.forEach((_) => {
          _.ele = document.getElementById(_.id);
        })
      })
      layerManagerComponent.value.logics = data.uploadedData.logic;
    })
  }
}

watch(
  () => state.isUpload,
  (newState) => {
    if (newState) {
      init();
    }
  })

emitter.on('downloadSvg', () => {
  const _ = {
    layer: toRaw(data.layers),
    logic: toRaw(layerManagerComponent.value.logics),
    editDataDict: toRaw(layerManagerComponent.value.editDataDict)
  }
  exportJson(_)
})


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

.toolbar {
  position: absolute;
  top: 10%;
  right: 0px;
}

.root-div {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-image: url(/background.png);
}
</style>
