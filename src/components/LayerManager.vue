<template>
    <div class="layer-manager"
        :style="{ height: height + 'px', width: width + 'px', left: left + 'px', top: top + 'px' }">

        <div class="header">
            <div class="mode" @click="state.mode = 'layer'">
                <div :style="{ opacity: state.mode === 'layer' ? '1' : '0' }"></div>
                <span>地图实体</span>
            </div>
            <div class="mode" @click="state.mode = 'logic'">
                <div :style="{ opacity: state.mode === 'layer' ? '0' : '1' }"></div>
                <span>逻辑组合</span>
            </div>
        </div>

        <div style="margin-top: 10px; margin-bottom: 10px; border: 0.25px solid #5B5B5B; flex-shrink: 0;" />

        <div class="layer-list">
            <div v-if="state.mode === 'layer'" v-for="(layer, key) in layers" :key="key" class="layer"
                :style="{ 'background-color': expandLayer == layer.name ? 'rgba(201, 201, 201, 0.15)' : 'transparent' }">
                <div class="layer-container"
                    :style="{ 'background-color': expandLayer == layer.name ? 'rgba(201, 201, 201, 0.4)' : 'transparent' }">
                    <span class="icon" @click="expandLayer = (expandLayer == layer.name ? '' : layer.name)">
                        <i v-if="layer.children"
                            :class="expandLayer == layer.name ? 'fa fa-angle-down' : 'fa fa-angle-right'">
                        </i>
                    </span>
                    <span class="layer-name">{{ layer.label }}</span>
                    <div style="margin-left: auto; margin-right: 3px; display: flex;">
                        <div v-if="layer.name === 'baseMap'" style="display: flex; align-items: center;">
                            <span style="font-size: small; margin-right: 5px;">透明度</span>
                            <el-slider v-if="layer.name === 'baseMap'" 
                                style="width: 200px; margin-right: 10px;"
                                v-model="state.mapOpacity" :step="0.1" :max="1" show-stops size="small"/>
                        </div>
                        <span class="icon" v-if="layer.userAdded" @click="addLayerItem(e, layer)">
                            <img :src="addUrl" alt="">
                        </span>
                        <span class="icon" v-if="layer.userAdded" @click="deleteLayer(e, layer)">
                            <img :src="deleteUrl" alt="">
                        </span>
                        <span class="icon">
                            <i @mouseover="hoverGroup(layer.children)" @mouseout="hoverGroup([])"
                                :class="state.layerVisibility[layer.name] ? 'fa fa-eye' : 'fa fa-eye-slash'"
                                @click="state.layerVisibility[layer.name] = !state.layerVisibility[layer.name]">
                            </i>
                        </span>
                    </div>
                </div>
                <div v-show="layer.children && expandLayer == layer.name" :style="{ 'padding-left': Indent + 'px' }">
                    <div v-for="(d, idx) in layer.children" :key="d.id" :id="`layer-${d.id}`"
                        @mouseenter="state.hoveredSVGElement($event, d.id)"
                        @mouseleave="state.hoveredSVGElement($event, null)" @click="state.focusedElementId = d.id"
                        class="eleBorder"
                        :style="{ 'border-color': state.hoveredElementId == d.id ? '#5B5B5B' : 'transparent' }">
                        <div class="eleContainer">
                            <span class="icon" @click="showEditPanel(d)">
                                <i :class="d.showEditPanel ? 'fa fa-angle-down' : 'fa fa-angle-right'"></i>
                            </span>
                            {{ d.label }}
                            <div style="margin-left: auto; display: flex">
                                <div class="icon" @click="enableEdit(d, layer)"
                                    :style="{ 'background-color': d.enableEdit ? 'rgba(201, 201, 201, 0.8)' : 'transparent' }">
                                    <img :src="editUrl" alt="">
                                </div>
                                <div class="icon" @click="addAttr(d)">
                                    <img :src="addUrl" alt="">
                                </div>
                                <span class="icon" v-if="layer.userAdded" @click="deleteAttr(d, layer)">
                                    <img :src="deleteUrl" alt="">
                                </span>
                                <span class="icon">
                                    <i :class="!(!!d.visible) ? 'fa fa-eye' : 'fa fa-eye-slash'"
                                        @click="d.visible = !(!!d.visible)">
                                    </i>
                                </span>
                            </div>
                        </div>
                        <div class="entityEdit" v-show="d.showEditPanel">
                            <div v-for="editItem in editDataDict[d.id]" class="inputDiv">
                                <span v-if="!editItem.editable" class="attributeName">{{ editItem.label }}</span>
                                <input v-else class="input" ref="newInput" @keyup.enter="$event.target.blur()"
                                    @blur="finishAddAttr($event, d)" v-model="editItem.label"
                                    style="flex: 0; width: 3.5em" placeholder="" />
                                <input :disabled="!d.enableEdit" class="input" v-model="editItem.data"
                                    style="width: 0px" placeholder="" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div v-if="state.mode === 'layer'">
                <div class="layer">
                    <div @click="clickAddLayerDiv"
                        style="display: flex; flex-direction: row; border-radius: 6px; justify-content: center; padding: 5px 0; cursor: pointer;">
                        <div class="icon" style="width: 20px;">
                            <img :src="addUrl" alt="">
                        </div>
                        添加新实体图层
                    </div>
                    <div v-if="addingLayerDiv" class="potential_layer">
                        <div class="inputDiv">
                            <span class="attributeName">图层名</span>
                            <input @blur="confirm" ref="input_layerName" class="input" v-model="newLayerName"
                                style="margin-right: 5px;">
                            <div class="btn" @click="confirm">确认</div>
                        </div>
                    </div>
                </div>
            </div>
            <div v-if="state.mode === 'logic'">
                <div v-for="(logic, key) in logics" class="layer"
                    :style="{ 'background-color': logic.showEditPanel ? 'rgba(201, 201, 201, 0.15)' : 'transparent' }">
                    <div class="eleContainer"
                        :style="{ backgroundColor: logic.showEditPanel ? 'rgba(201, 201, 201, 0.4)' : 'transparent' }">
                        <span class="icon" @click="showEditPanel(logic)">
                            <i :class="logic.showEditPanel ? 'fa fa-angle-down' : 'fa fa-angle-right'"></i>
                        </span>
                        {{ logic.label }}
                        <div style="margin-left: auto;">
                            <div class="icon" @click="deleteLogicLayer(logic)">
                                <img :src="deleteUrl" alt="">
                            </div>
                        </div>
                    </div>
                    <div class="entityEdit" v-show="logic.showEditPanel">
                        <div class="logicContent">
                            <div class="logicItemHeader">
                                <span class="attributeName" style="width: 5em;">逻辑内容：</span>
                                <div style="margin-left: auto; display: flex;">
                                    <div class="icon" @click="enableEditLogic(logic)"
                                        :style="{ 'background-color': logic.enableEdit ? 'rgba(201, 201, 201, 0.8)' : 'transparent' }">
                                        <img :src="editUrl" alt="">
                                    </div>
                                    <!-- <div class="icon" @click="addAttr(logic)">
                                        <img :src="addUrl" alt="">
                                    </div> -->
                                </div>
                            </div>
                            <div class="logicItem">
                                <div v-for="editItem in logic.content" class="inputDiv">
                                    <span class="attributeName">{{ editItem.label }}</span>
                                    <input v-if="editItem.dom == 'input'" :disabled="!logic.enableEdit" class="input"
                                        v-model="editItem.data" style="width: 0px" placeholder="" />
                                    <textarea v-else :disabled="!logic.enableEdit" class="input" v-model="editItem.data"
                                        rows="5" style="resize: none; height: fit-content; line-height: 24px;"
                                        placeholder="">
                                    </textarea>
                                </div>
                            </div>
                        </div>
                        <div class="logicSet">
                            <div class="logicItemHeader">
                                <span class="attributeName" style="width: 5em; margin-left: 3px;">集合：</span>
                                <div style="margin-left: auto; display: flex;">
                                    <div class="icon" @click="addLogic(logic, 'set')">
                                        <img :src="addUrl" alt="">
                                    </div>
                                    <span class="icon">
                                        <i @mouseover="hoverGroup(logic.set)" @mouseout="hoverGroup(null)"
                                            :class="logic.setVisible ? 'fa fa-eye' : 'fa fa-eye-slash'"
                                            @click="logic.setVisible = !logic.setVisible; changeSVGElementGroupOpacity(logic.set)">
                                        </i>
                                    </span>
                                </div>
                            </div>
                            <div class="logicItem" v-show="logic.set.length">
                                <div class="eleContainer" v-for="element in logic.set">
                                    {{ element.ele.getAttribute('_label') }}
                                    <div style="margin-left: auto; display: flex">
                                        <div class="icon" @click="deleteSVGElement(logic.set, element)">
                                            <img :src="deleteUrl" alt="">
                                        </div>
                                        <span class="icon">
                                            <i :class="element.visible ? 'fa fa-eye' : 'fa fa-eye-slash'"
                                                @click="changeSVGElementOpacity(element)">
                                            </i>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="logicSequence">
                            <div class="logicItemHeader">
                                <span class="attributeName" style="width: 5em;">序列：</span>
                                <div style="margin-left: auto; display: flex;">
                                    <div class="icon" @click="addLogic(logic, 'sequence')">
                                        <img :src="addUrl" alt="">
                                    </div>
                                    <span class="icon">
                                        <i @mouseover="hoverGroup(logic.sequence)" @mouseout="hoverGroup(null)"
                                            :class="logic.sequenceVisible ? 'fa fa-eye' : 'fa fa-eye-slash'"
                                            @click="logic.sequenceVisible = !logic.sequenceVisible; changeSVGElementGroupOpacity(logic.sequence)">
                                        </i>
                                    </span>
                                </div>
                            </div>
                            <div class="logicItem" v-show="logic.sequence.length">
                                <div class="eleContainer" style="border: 1px solid transparent;"
                                    v-for="(element, index) in logic.sequence">
                                    {{ index + 1 }} - {{ element.ele.getAttribute('_label') }}
                                    <div style="margin-left: auto; display: flex">
                                        <div class="icon" @click="deleteSVGElement(logic.sequence, element)">
                                            <img :src="deleteUrl" alt="">
                                        </div>
                                        <span class="icon">
                                            <i :class="element.visible ? 'fa fa-eye' : 'fa fa-eye-slash'"
                                                @click="changeSVGElementOpacity(element)">
                                            </i>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="layer" @click="addLogicLayer"
                    style="display: flex; flex-direction: row; border-radius: 6px; justify-content: center; margin-top: 5px; padding: 5px 0; cursor: pointer;">
                    <div class="icon" style="width: 20px;">
                        <img :src="addUrl" alt="">
                    </div>
                    添加新组合
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import * as d3 from 'd3'
import { useStoreState, useStoreData } from "@/stores";
import { ref, computed, watch, nextTick, useTemplateRef, inject, onMounted } from "vue";
import edit from '@/assets/edit.svg'
import add from '@/assets/add.svg'
import deleteIcon from '@/assets/delete.svg'
const emitter = inject('emitter')

const state = useStoreState();
const data = useStoreData();

const layers = data.getLayers();
const expandLayer = ref("")

// 添加实体图层代码
const newLayerName = ref("")
const addingLayerDiv = ref(false);
const input_layerName = useTemplateRef('input_layerName')
const clickAddLayerDiv = (e) => {
    addingLayerDiv.value = true;
    nextTick(() => {
        input_layerName.value.focus()
    })
}
const confirm = () => {
    const hasSameName = layers.value.map(_ => _.label).includes(newLayerName.value)
    if (newLayerName.value === "") {
        addingLayerDiv.value = false;
        emitter.emit("showInfo", `<span>请勿输入空白图层名称<span>`);
        setTimeout(() => {
            emitter.emit("closeInfo")
        }, 2000)
        return;
    }
    if (hasSameName) {
        addingLayerDiv.value = false;
        emitter.emit("showInfo", `<span>图层名称重复，请重试<span>`);
        setTimeout(() => {
            emitter.emit("closeInfo")
        }, 2000)
        return;
    }
    state.addLayerVisibility(newLayerName.value); // 添加对于新图层visibility的控制
    data.addLayer(newLayerName.value)
    layers.value.push({ name: newLayerName.value, label: newLayerName.value, visible: true, children: data.layers[newLayerName.value], userAdded: true }); //添加新特层到layers中
    addingLayerDiv.value = false; //完成新图层的添加
    newLayerName.value = "";
}

const addLayerItem = (event, layer) => {
    state.addingLayerEntity = true; // 设置为添加图层实体模式
    state.addingLayer = layer; // 保存当前添加的图层到pinia内
    expandLayer.value = state.addingLayer.name; // 展开当前要添加的图层
    emitter.emit('showInfo_MapClick') // 显示提示，允许用户点击选择位置
}

function intersection(setA, setB) {
    return new Set([...setA].filter(x => setB.has(x)));
}

const deleteLayer = (event, layer) => {
    const IdsInLayer = new Set(layer.children.map(d => d.id));
    const _intersection = intersection(state.logicRelatedIds, IdsInLayer)
    if (_intersection.size !== 0) {
        emitter.emit('showInfo', '<span>地图实体在逻辑组中出现，暂时无法删除</span>')
        setTimeout(() => {
            emitter.emit('closeInfo')
        }, 2000)
        return;
    }
    delete data.layers[layer.name]
    let _idx = layers.value.findIndex(_ => _.name === layer.name)
    layers.value.splice(_idx, 1)

}

watch(
    () => state.clickMapBool, 
    (newValue) => {
    if (newValue) {
        const newId = `${state.addingLayer.name}_${new Date().getTime().toString(36)}`
        state.addingLayer.children.push({
            id: newId,
            pos: state.mousePositionOnMap,
            fill: "black",
            tag: "circle",
            text: [
                {
                    pos: [state.mousePositionOnMap[0] - 12, state.mousePositionOnMap[1] - 10],
                    text: "placeholder",
                }
            ],
            label: 'Placeholder',
        })
        addNewDataDictItem(newId);
        state.clickMapBool = false;
    }
})


// 获取所有地图实体的id，构建一个id->实体标注的obj
const keys = [
    ...Object.values(data.layers.wall).map(d => d.id),
    ...Object.values(data.layers.water).map(d => d.id),
    ...Object.values(data.layers.building).map(d => d.id),
    ...Object.values(data.layers.road).map(d => d.id),
    ...Object.values(data.layers.door).map(d => d.id),
]
function defaultEditableValues() {
    return [
        {
            label: "名 称：",
            data: "",
            editable: false
        },
        {
            label: "时 间：",
            data: "",
            editable: false
        },
        {
            label: "描 述：",
            data: "",
            editable: false
        }
    ];
}
const itemList = keys.map(key => {
    return [key, defaultEditableValues("")
    ]
})
const editDataDict = ref(Object.fromEntries(itemList));

const addNewDataDictItem = (key) => { // 添加新的图层实体后需要再dataDict中添加对应的id->实体映射
    editDataDict.value[key] = defaultEditableValues("")
}
const temptAttrite = () => {
    return { label: "", data: "", editable: true }
}

const refNewInput = useTemplateRef("newInput");
const addAttr = async (d) => {
    if (!d.showEditPanel) {
        return
    }
    editDataDict.value[d.id].push(temptAttrite());
    await nextTick();
    refNewInput.value[0].focus();
}
const finishAddAttr = (e, d) => {
    let label = editDataDict.value[d.id].at(-1).label;
    if (!label) {
        editDataDict.value[d.id].pop()
        return
    }
    if (label.length === 2) {
        label = label[0] + ' ' + label[1];
    }
    label += '：'
    editDataDict.value[d.id].at(-1).label = label
    editDataDict.value[d.id].at(-1).editable = false;
}

const deleteAttr = (d, layer) => {
    const deleteIndex = data.layers[layer.name].findIndex(child => child.id === d.id);
    data.layers[layer.name].splice(deleteIndex, 1);
}


// 基础设置
const props = defineProps({
    height: {
        type: Number,
        default: 0,
    },
    width: {
        type: Number,
        default: 0,
    },
    left: {
        type: Number,
        default: 0,
    },
    top: {
        type: Number,
        default: 0,
    },
});
const height = computed(() => props.height);
const width = computed(() => props.width);
const left = computed(() => props.left);
const top = computed(() => props.top);

// icon 
const editUrl = ref(edit)
const addUrl = ref(add)
const deleteUrl = ref(deleteIcon)
const Indent = ref(15); // 缩进
const showEditPanel = (d) => {
    d.showEditPanel = (!!d.showEditPanel) ? false : true;
}

const enableEdit = (d, layer) => {
    d.showEditPanel = true;
    if (d.enableEdit) {//结束修改
        state.editing = false;
        state.hoveredElementId = null;
        d.enableEdit = false;
        // 根据用户修改的name，将其同步到地图实体的label
        const userModifiedEntityName = editDataDict.value[d.id][0].data;
        if (userModifiedEntityName) {
            d.label = userModifiedEntityName;
            if (layer.userAdded) {
                d.text[0].text = userModifiedEntityName;
            }
        }
    } else {//开始修改
        state.editing = true;
        state.hoveredElementId = d.id;
        d.enableEdit = true;
    }
}

emitter.on('editElement', (d) => {
    if (state.mode == 'layer') {
        enableEdit(d);
    }
})

function hoverGroup(layerChildren) {
    if (!layerChildren) {
        state.hoveredGroup = [];
        return;
    }
    state.hoveredGroup = layerChildren.map(d => d.id)
}


// 逻辑组代码
const logicContent = () => {
    return [
        {
            label: "名 称：",
            data: "",
            dom: "input",
        },
        {
            label: "时 间：",
            data: "",
            dom: "input",
        },
        {
            label: "描 述：",
            data: "",
            dom: "textarea",
        }
    ]
}
const logics = ref([
    { id: '数据1', label: "数据1", content: logicContent(), expand: false, set: [], sequence: [], setVisible: true, sequenceVisible: true },
])

const enableEditLogic = (d) => {
    // finished_callback_func为结束修改后的回调函数
    // 首个参数为修改的d
    if (d.enableEdit) {//结束修改
        state.editing = false;
        state.hoveredElementId = null;
        if (d.content[0].data) { // 将输入的name同步到logic Item的label显示上
            d.label = d.content[0].data;
        }
        d.enableEdit = false;
    } else {//开始修改
        state.editing = true;
        d.enableEdit = true;
    }
}

const addLogic = (logic, logicMode) => {
    window.onclick = () => {
        if (state.mode === 'logic' && state.selecting && state.hoveredElementId) {
            if (logicMode === 'set' && logic[logicMode].map(_ => _.id).includes(state.hoveredElementId)) {
                return; // 如果为集合，且已经包含了这个实体，则返回
            }
            logic[logicMode].push({
                id: state.hoveredElementId,
                ele: state.hoveredElement,
                // label: state.hoveredElement.getAttribute('_label'),
                visible: true
            })
            state.logicRelatedIds.add(state.hoveredElementId);
        }
    }
    emitter.emit("showInfo", `<span>正在添加${logicMode === 'set' ? "集合" : "序列"}<br>单击添加地图实体<br>回车完成添加<span>`)
    state.selecting = true;
}

const addLogicLayer = () => {
    logics.value.push(
        { id: `数据${logics.value.length + 1}`, label: `数据${logics.value.length + 1}`, content: logicContent(), expand: false, set: [], sequence: [], setVisible: true, sequenceVisible: true }
    )
}
const deleteLogicLayer = (layer) => {
    const delete_index = logics.value.findIndex(_ => _.id === layer.id);
    // 从logicRelatedIds删除逻辑layer下所有的有关的实体
    logics.value[delete_index].set.forEach(_ => {
        state.logicRelatedIds.delete(_.id);
    })
    logics.value[delete_index].sequence.forEach(_ => {
        state.logicRelatedIds.delete(_.id);
    })
    logics.value.splice(delete_index, 1);
}


onMounted(() => {
    window.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            window.onclick = null;
            emitter.emit('closeInfo');
            state.selecting = false;
            state.addingLayerEntity = false; // 取消添加图层实体模式
        }
    })
})

const changeSVGElementOpacity = (element) => {
    element.visible = !(element.visible)
    const gorupSvg = element.ele.parentNode;
    gorupSvg.style.opacity = element.visible ? 1 : 0;
}
const changeSVGElementGroupOpacity = (elementGroup) => {
    elementGroup.forEach(_ => {
        changeSVGElementOpacity(_);
    })
}
const deleteSVGElement = (current, toRemoveElement) => {
    const delete_index = current.findIndex(_ => _.id === toRemoveElement.id);
    state.logicRelatedIds.delete(toRemoveElement.id);
    current.splice(delete_index, 1)
}



watch(
    () => state.hoveredElementId,
    (newHoveredId) => {
        if (!newHoveredId) {
            return
        }
        const hoveredSVGElement = d3.select(`[id="${newHoveredId}"]`);
        if (!hoveredSVGElement.node()) {
            return
        }
        const group = hoveredSVGElement.node().parentNode;
        d3.select(group).raise();
        expandLayer.value = hoveredSVGElement.attr("belong")
        if (state.mode === 'layer' && state.hoveredElement.tagName == 'path') {
            const LaylerId = "layer-" + hoveredSVGElement.attr('id');
            const selectedLayerItem = d3.select(`[id="${LaylerId}"]`);
            nextTick(() => {
                selectedLayerItem.node().scrollIntoView({ behavior: "smooth", block: "center" });
            })
        }
    }
);


defineExpose({ layers, logics,  editDataDict })
</script>

<style scoped>

.el-slider{
    --el-slider-main-bg-color: #3A3A3A;
    --el-slider-runway-bg-color: #E5E5E5;
    --el-slider-stop-bg-color: #ccc;
    --el-slider-button-size: 12px;
}
.el-slider__runway{
    overflow: visible;
    
}

.layer-manager {
    --header-height: 30px;
    position: absolute;
    display: flex;
    flex-direction: column;
    overflow: visible;
    z-index: 1;
    top: 10vh;
    left: 1vw;
    height: 87vh;
    width: 20vw;
    padding: 10px 12px;
    color: #3A3A3A;
    border: 1px solid #ccc;
    border-radius: 10px;
    background-color: #fff;
    fill: #ffffff9c;
    stroke-width: 1px;
    stroke: #E5E5E5;
    filter: drop-shadow(2px 2px 6px rgba(0, 0, 0, 0.15));
}

.header {
    display: flex;
    height: var(--header-height);
    min-height: var(--header-height);
    flex-shrink: 0;
}

.mode {
    width: 50%;
    height: 100%;
    position: relative;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

.mode div {
    width: 100%;
    background-color: rgba(201, 201, 201, 0.4);
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
    z-index: -1;
}

.mode span {
    height: 100%;
    line-height: var(--header-height);
}

.layer-list {
    flex: 1;
    overflow-y: auto;
    scrollbar-gutter: stable;
}


.layer-container {
    display: flex;
    align-items: center;
    height: 28px;
    border-radius: 6px;
}

.layer {
    display: flex;
    flex-direction: column;
    border-radius: 6px;
}

.layer:hover {
    background-color: rgba(201, 201, 201, 0.15) !important
}

.eleBorder {
    display: flex;
    flex-direction: column;
    border-radius: 6px;
    border: 1px solid transparent;
}

.eleContainer {
    display: flex;
    height: 28px;
    align-items: center;
    border-radius: 6px;
    padding: 0px 3px;
    cursor: pointer;
}

.eleContainer:hover {
    border-color: #5B5B5B;
}

.entityEdit {
    /* width: 100%; */
    height: fit-content;
    padding-bottom: 3px;
    padding-left: 3px;
    padding-right: 3px;
    /* border: black 1px solid; */
}

.inputDiv {
    line-height: 28px;
    display: flex;
    padding: 0px 3px;
    margin: 1px 0px;
    /* width: 100%; */
}

.attributeName {
    width: 3.3em;
    overflow: hidden;
    /* 隐藏超出宽度的内容 */
    text-overflow: ellipsis;
    /* 溢出时显示省略号 */
    white-space: nowrap;
    /* 防止文本换行 */
    display: inline-block;
    /* 确保宽度生效 */
    text-align: left;
    margin-left: 5px;
}

.input {
    flex: 1;
    width: 100%;
    border: 1px solid #C9C9C9;
    fill: #FFF;
    font-size: 16px;
    /* height: 24px; */
}


.input:focus {
    outline: none;
}

.input:disabled {
    cursor: not-allowed;
}

.btn {
    background-color: rgba(201, 201, 201, 0.4);
    padding: 0px 5px;
    cursor: pointer;
}

.btn:hover {
    background-color: rgba(201, 201, 201, 0.7);
}

.icon {
    width: 16px;
    padding: 1px;
    border-radius: 4px;
    /* height: 20px; */
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
}

.icon img {
    width: 100%;
    height: 100%;
}

.logicItemHeader {
    display: flex;
    align-items: center;
    margin: 5px 0px;
}

.logicItem {
    border: 1px solid #5B5B5B;
    display: flex;
    flex-direction: column;
    padding: 3px;
    border-radius: 6px;
    /* pointer-events: none; */
}
</style>
