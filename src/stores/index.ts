import { computed, Ref, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { EntityAnnotation, LayerEntity, LogicAnnotation } from '@/type'

export const useStoreState = defineStore('state', () => {
    // 控制地图的显示状态
    const baseMapVisible: Ref<boolean> = ref(true);
    const mapOpacity: Ref<number> = ref(0.2);

    const isExport: Ref<boolean> = ref(false);
    const isUpload: Ref<boolean> = ref(false);
    const uploadedData = ref(null)

    const layerVisibility: Ref<Object> = ref({});
    const addLayerVisibility = (layerName: string | string[]) => {
        if(typeof layerName === 'string'){
            layerVisibility.value[layerName] = true;
        }else{
            for(let i of layerName){
                layerVisibility.value[i] = true;
            }
        }
    }
    
    const hoveredElementId: Ref<null | string> = ref(null);
    const hoveredElement: Ref<null | SVGElement> = ref(null);
    const hoveredGroup: Ref<null | SVGElement[]> = ref([])
    const mode: Ref<string> = ref("layer")
    const focusedElementId: Ref<null | string> = ref(null);
    const hoveredAnnotationId: Ref<null | number> = ref(null);

    const mouseMode: Ref<string> = ref("default");
    const editing: Ref<boolean> = ref(false); //是否正在修改信息
    const selecting: Ref<boolean> = ref(false); //是否正在修改信息
    const addingLayerEntity: Ref<boolean> = ref(false); //是否正在添加图层实体
    const addingLayer: Ref<LayerEntity> = ref(null); //是否正在添加图层实体

    const logicRelatedIds: Ref<Set<string>> = ref(new Set()) // 保存所有在logic组中出现的实体id，在删除实体图层时使用这个数组检查，防止删除在逻辑组中使用过的实体
    const mousePositionOnMap: Ref<number[]> = ref([0, 0]) 
    const clickMapBool: Ref<boolean> = ref(false);

    const hoveredSVGElement = (e: PointerEvent, id: null | string) => {
        if (editing.value || addingLayerEntity.value) { //正在修改信息或正在添加图层实体 的时候不需要切换hoverSVG
            return
        }
        hoveredElementId.value = id;
        hoveredElement.value = e.target as SVGElement | null;
    }

    return {
        baseMapVisible,
        mapOpacity,
        hoveredElementId,
        hoveredGroup,
        hoveredElement,
        focusedElementId,
        hoveredAnnotationId,

        isUpload,
        isExport,
        uploadedData,

        mode,
        editing,
        selecting,
        addingLayerEntity,
        addingLayer,

        logicRelatedIds,
        layerVisibility,
        mouseMode,
        mousePositionOnMap,
        clickMapBool,

        hoveredSVGElement,
        addLayerVisibility
    }
})

export const useStoreData = defineStore('data', () => {
    const layers = ref({
        water : [],
        wall : [],     
        building : [],
        door : [],       
        road : []
    })
    const addLayer = (layerName: string) => {
        layers.value[layerName] = []
    }

    const getLayers = () => {
        let _ = [
            { name: "baseMap", label: "底图", visible: true },
            { name: "wall", label: "城墙", visible: true, children: layers.value.wall },
            { name: "water", label: "水系", visible: true, children: layers.value.water },
            { name: "building", label: "城坊", visible: true, children: layers.value.building },
            { name: "road", label: "街道", visible: true, children: layers.value.road },
            { name: "door", label: "城门", visible: true, children: layers.value.door },
        ]
        for(let k of userAddKeys.value){
            _.push({ name: k, label: k, visible: true, children: layers.value[k], userAdded: true });
        }
        return ref(_)
    }

    const userAddKeys = computed(() => {
        return Object.keys(layers.value).filter((key) => !['door', 'water', 'building', 'road', 'wall'].includes(key))
    })

    return {
        layers,
        userAddKeys,
        addLayer,
        getLayers,
    }
})

