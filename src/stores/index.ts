import {computed, Ref, ref, shallowRef} from 'vue'
import { defineStore } from 'pinia'
import { EntityAnnotation, LogicAnnotation } from '@/type'

export const useStoreState =  defineStore('state', ()=>{
    // 控制地图的显示状态
    const baseMapVisible:Ref<boolean> =  ref(true);

    const roadVisible:Ref<boolean> = ref(true);
    const wallVisible:Ref<boolean> = ref(true);
    const waterVisible:Ref<boolean> = ref(true);
    const buildingVisible:Ref<boolean> = ref(true);
    const doorVisible:Ref<boolean> = ref(true);

    const hoveredElement:Ref<null|string> = ref(null);
    const focusedElementId:Ref<null|string> = ref(null);
    const hoveredAnnotationId:Ref<null|number> = ref(null);

    const mouseMode:Ref<string> = ref("default") 

    return {
        baseMapVisible,
        hoveredElement,
        focusedElementId,
        hoveredAnnotationId,
        roadVisible,
        wallVisible,
        waterVisible,
        buildingVisible,
        doorVisible,
        mouseMode
    }
})

export const useStoreData = defineStore('data', ()=>{
    const water = ref([]);
    const wall = ref([]);
    const building = ref([]);
    const door = ref([]);
    const road = ref([]);
    
    const annotationList:Ref<Annotation[]> = ref([]);
    const annotationId2index = computed(() => {
        const map = new Map();
        annotationList.value.forEach((annotation, index) => {
          map.set(annotation.id, index);
        });
        return map;
      });
    
    const getAnno=(id: number)=> {
        const index = annotationId2index.value.get(id);
        if (index !== undefined) {
          return annotationList.value[index];
        }
        return null;
      }

    return {
        annotationList,
        annotationId2index,
        water,
        wall,
        building,
        door,
        road,
        getAnno,
    }
})
