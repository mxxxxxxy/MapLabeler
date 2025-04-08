import {computed, Ref, ref,shallowRef} from 'vue'
import { defineStore } from 'pinia'
import { Annotation } from '@/type'

export const useStoreState =  defineStore('state', ()=>{
    // 控制地图的显示状态
    const baseMapVisible:Ref<boolean> =  ref(true);
    const areasVisible:Ref<boolean> = ref(true);
    const pathsVisible:Ref<boolean> = ref(true);
    const pointsVisible:Ref<boolean> = ref(true);

    const hoveredElement:Ref<null|string> = ref(null);
    const focusedElementId:Ref<null|string> = ref(null);
    const hoveredAnnotationId:Ref<null|number> = ref(null);


    return {
        baseMapVisible,
        areasVisible,
        pathsVisible,
        pointsVisible,
        hoveredElement,
        focusedElementId,
        hoveredAnnotationId,
    }
})

export const useStoreData = defineStore('data', ()=>{
    const pointCoordinates= ref([]);
    const pathData = ref([]);
    const areaCoordinates = ref([]);

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
        pointCoordinates,
        pathData,
        areaCoordinates,
        annotationList,
        annotationId2index,
        getAnno,
    }
})