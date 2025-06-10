<template>
  <div class="root-div">
    <span class="title" style="position: absolute; top: 0; left: 0; z-index: 1;">
      古代地理空间主题地图
    </span>
    <SvgPlotter :height="height" :width="width / 2" :left="width / 4" :top="0" />
    <div class="toolbar">
      <toolBar> </toolBar>
    </div>
    <LayerManager :key="layerManagerComponentKey" :height="height * 0.85" :width="width / 5 < 345.6 ? 345.6 : width / 5" :left="width / 100"
      :top="height / 10" ref="layerManager" />
    <Info></Info>
  </div>
</template>

<script setup>
import Changan from '@/assets/TangData.json';
import QuanTangData from '@/assets/QuanTangData.json';
import SvgPlotter from './components/SvgPlotter.vue';
import LayerManager from './components/LayerManager.vue';
import { exportJson } from "@/utils";
import Info from './components/Info.vue';
import { useStoreData, useStoreState } from './stores/index.js';
import { getImageSize } from './utils/index'
import { nextTick, ref, watch, useTemplateRef, toRaw, inject, onMounted } from 'vue';
import toolBar from './components/toolBar.vue';
import QuanTangPNG from '@/assets/QuanTang.png'
import ChanganPNG from '@/assets/Changan.png'
// ------
const emitter = inject('emitter');

const layerManagerComponent = useTemplateRef('layerManager');
const data = useStoreData();
const state = useStoreState();
const layerManagerComponentKey = ref(0);

const refreshWhenUploadUserData = () => {
  if (state.isUpload) {
    Object.keys(data.uploadedData.layer).forEach(key => {
      data.layers[key] = data.uploadedData.layer[key];
      // assignLabelById(data.layers[key]);
    });
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
      refreshWhenUploadUserData();
    }
  })

emitter.on('downloadSvg', () => {
  const _ = {
    layer: toRaw(data.layers),
    logic: toRaw(layerManagerComponent.value.logics),
    editDataDict: toRaw(layerManagerComponent.value.editDataDict),
    dataName: state.usedDataName
  }
  exportJson(_, `${state.usedDataName}.json`)
})

const assignLabelById = (arr) => {
    arr.forEach((d) => {
      if(d.id.includes('CHGIS')){
        d.label = d.id.replace('CHGIS', '')
      }
      else{d.label = d.id;}
    })
}

const init = (selectedData) => {
  if (selectedData == Changan) {
    data.baseMapSource = ChanganPNG;
    state.mapOpacity = 0.2;
  } else {
    data.baseMapSource = QuanTangPNG;
    state.mapOpacity = 0.7;
  }
  getImageSize(data.baseMapSource).then(baseMapSize => {
    state.baseMapSize = baseMapSize
  })

  // TangData
  for (let key of Object.keys(selectedData)) {
    data.addPredefinedLayer(key, selectedData[key]);
    state.addLayerVisibility(key)
    assignLabelById(data.layers[key]);
  }
  state.addLayerVisibility('baseMap');
}

init(Changan);

watch(
  () => state.usedDataName,
  (newDataName) => {
    state.$reset();
    data.$reset();
    if (newDataName === 'QuanTangData') {
      init(QuanTangData);
    } else if (newDataName === 'Changan') {
      init(Changan);
    }
    layerManagerComponentKey.value += 1; // 手动刷新layerManager
  }
)


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
