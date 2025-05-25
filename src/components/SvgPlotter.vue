<template>
    <div class="svg-plotter-container"
        :style="{ height: containerHeight + 'px', width: containerWidth + 'px', left: left + 'px', top: top + 'px' }">
        <!-- 控制面板 -->
        <div class="control-container">
            <div class="ctrl-bottom-right">
                <div class="ctrl-group">
                    <button class="ctrl-zoom-in" type="button" aria-label="Zoom in" @click="zoomIn">
                        <span class="icon" aria-hidden="true" title="放大"></span>
                    </button>
                    <button class="ctrl-zoom-out" type="button" aria-label="Zoom out" @click="zoomOut">
                        <span class="icon" aria-hidden="true" title="缩小"></span>
                    </button>
                </div>
            </div>
            <div class="ctrl-top-right">
                <span class="compass-label">北</span>
                <span class="compass-subtext">North</span>
                <img src="@/assets/compass.svg" alt="compass" class="compass-img" />
            </div>
        </div>

        <!-- SVG 地图 -->
        <svg ref="mapSvg" class="map-svg">
            <!-- 缩放&平移容器 -->
            <g id="map-container" ref="map" @mousemove="overBaseMap" @click="clickBaseMap"
                :class="{ 'circular-curcor': state.addingLayerEntity }">
                <!-- 底图 -->
                <g v-if="state.layerVisibility.baseMap">
                    <image class="base-map" :href="data.baseMapSource" 
                        x="0" 
                        y="0" 
                        :width="state.baseMapSize.width" 
                        :height="state.baseMapSize.height"
                        :opacity="state.mapOpacity" />
                </g>

                <g v-for="key in Object.keys(data.layers)">
                    <g v-if="state.layerVisibility[key]">
                        <g v-for="(attr, idx) in data.layers[key]" v-show="!attr.visible">
                            <path v-if="attr.tag === 'path'" 
                                :key="attr.id" 
                                :id="attr.id" 
                                :d="attr.d" 
                                :belong="key" 
                                :_label="attr.label"
                                :stroke="attr.stroke" 
                                :fill="attr.fill ? attr.fill : 'none'" 
                                :stroke-width="attr['stroke-width']"
                                :class="{ highlight: isHightlight(attr) }"
                                @mouseenter="state.hoveredSVGElement($event, attr.id)"
                                @mouseleave="state.hoveredSVGElement($event, null)" 
                                @click="clickEvent($e, attr)" />

                            <circle v-if="attr.tag === 'circle'" 
                                :key="attr.id" 
                                :id="attr.id" 
                                :cx="attr.cx"
                                :cy="attr.cy"
                                :r="attr.r"
                                :belong="key" 
                                :_label="attr.label"
                                :stroke="attr.stroke" 
                                :fill="attr.fill ? attr.fill : 'none'" 
                                :stroke-width="attr['stroke-width']"
                                :class="{ highlight: isHightlight(attr) }"
                                @mouseenter="state.hoveredSVGElement($event, attr.id)"
                                @mouseleave="state.hoveredSVGElement($event, null)" 
                                @click="clickEvent($e, attr)" />

                            <text v-for="t in attr.text" 
                                :id="`text${t.text}`" 
                                :key="attr.id" 
                                :stroke="attr.stroke"
                                :x="t.pos ? t.pos[0] : 0" 
                                :y="t.pos ? t.pos[1] : 0"
                                :fill="isHightlight(attr) ? 'red' : 'black'" 
                                :stroke-width="0"
                                :font-size="t['font-size'] ? t['font-size'] : 12"
                                :transform="t['transform']">
                                {{ t.text }}
                            </text>
                        </g>
                    </g>
                </g>

                <!-- 其他 -->
                <g v-for="key in data.userAddKeys">
                    <g class="areas" v-if="state.layerVisibility[key]">
                        <g v-for="(attr, idx) in data.layers[key]" v-show="!attr.visible">
                            <circle :key="idx" :cx="attr.pos[0]" :cy="attr.pos[1]" r="7" :id="attr.id" :belong="key"
                                :_label="attr.label" :stroke="attr.stroke" :fill="attr.fill"
                                :stroke-width="attr['stroke-width']" :class="{ highlight: isHightlight(attr) }"
                                @mouseenter="state.hoveredSVGElement($event, attr.id)"
                                @mouseleave="state.hoveredSVGElement($event, null)" @click="clickEvent($e, attr)" />

                            <text v-for="t in attr.text" :key="attr.id" :stroke="attr.stroke" :x="t.pos ? t.pos[0] : 0"
                                :y="t.pos ? t.pos[1] : 0" :fill="isHightlight(attr) ? 'red' : 'black'" font-size="12">
                                {{ t.text }}
                            </text>
                        </g>
                    </g>
                </g>
            </g>
        </svg>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick, useTemplateRef, provide } from "vue";
import * as d3 from "d3";
import { useStoreState, useStoreData } from "@/stores";
import { projectCoordinates, extract_coordinate, exportSVG, exportJson } from "@/utils";
import { inject, toRaw } from 'vue'
const emitter = inject('emitter')

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

const containerHeight = computed(() => props.height);
const containerWidth = computed(() => props.width);
const left = computed(() => props.left);
const top = computed(() => props.top);

// 限制聚焦的最小宽高，以避免过度缩放
const zoomMinWidth = 100;
const zoomMinHeight = 100;

// 响应式状态和数据
const state = useStoreState();
const data = useStoreData();
// zoom、pan 相关状态
const width = ref(window.innerWidth);
const height = ref(window.innerHeight);
const scale = ref(0.7);
const translateX = ref(500);
const translateY = ref(20);

// 保存 d3.zoom 实例
const zoom = ref(d3.zoom());


// svg ref 用于获取 DOM 节点
const map = ref(null);
const mapSvg = ref(null);

// emitter.on('downloadSvg', () => {
//     exportSVG(mapSvg.value);
// })

function clickEvent(e, d) {
    if (state.addingLayerEntity) {
        return
    }
    // if(!state.editing){
    emitter.emit('editElement', d);
    // }
}


// const map = useTemplateRef('map');
function overBaseMap(e) {
    if (state.addingLayerEntity) {
        let pt = mapSvg.value.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        let gMatrix = map.value.getScreenCTM().inverse(); // 当前g全局矩阵的逆矩阵
        let localPt = pt.matrixTransform(gMatrix);
        state.mousePositionOnMap = [localPt.x, localPt.y]
    }
}

function clickBaseMap() {
    if (state.addingLayerEntity) {
        state.clickMapBool = true;
    }
}

// const doorGroups = useTemplateRef('doorGroups')
// const buildingGroups = useTemplateRef('buildingGroups')

// 内部辅助函数：计算平移后的 zoom transform
const _translate = (transform, p0, p1) => {
    const x = p0[0] - p1[0] * transform.k,
        y = p0[1] - p1[1] * transform.k;
    return x === transform.x && y === transform.y
        ? transform
        : new d3.ZoomTransform(transform.k, x, y);
};

// 内部辅助函数：计算缩放后的 zoom transform
const _scale = (transform, k) =>
    k === transform.k
        ? transform
        : new d3.ZoomTransform(k, transform.x, transform.y);

// // 内部辅助函数：用于将视图缩放到指定的边界框
// function zoomToBbox(bbox) {
//     const r = 1;
//     if (bbox.width / bbox.height > containerWidth.value / containerHeight.value) {
//         const scale = containerWidth.value / bbox.width * r;
//         const dx = left.value;
//         const dy = (containerHeight.value - bbox.height * scale) / 2;
//         const offsetX = -bbox.x * scale + dx;
//         const offsetY = -bbox.y * scale + dy;
//         d3.select(mapSvg.value)
//             .transition()
//             .duration(500)
//             .call(zoom.value.transform, d3.zoomIdentity.translate(offsetX, offsetY).scale(scale));
//         return;
//     } else {
//         const scale = containerHeight.value / bbox.height * r;
//         const dx = (containerWidth.value - bbox.width * scale) / 2 + left.value;
//         const dy = 0;
//         const offsetX = -bbox.x * scale + dx;
//         const offsetY = -bbox.y * scale + dy;
//         d3.select(mapSvg.value)
//             .transition()
//             .duration(500)
//             .call(zoom.value.transform, d3.zoomIdentity.translate(offsetX, offsetY).scale(scale));
//     }
// }

// 缩放函数：放大
const zoomIn = () => {
    const svg = d3.select(mapSvg.value);
    const currentZoom = d3.zoomTransform(svg.node());
    const p0 = [width.value / 2, height.value / 2];
    const p1 = currentZoom.invert(p0);
    const k1 = currentZoom.k * 1.5;
    const t1 = _translate(_scale(currentZoom, k1), p0, p1);
    svg.transition().duration(500).call(zoom.value.transform, t1);
};

// 缩放函数：缩小
const zoomOut = () => {
    const svg = d3.select(mapSvg.value);
    const currentZoom = d3.zoomTransform(svg.node());
    const p0 = [width.value / 2, height.value / 2];
    const p1 = currentZoom.invert(p0);
    const k1 = currentZoom.k / 1.5;
    const t1 = _translate(_scale(currentZoom, k1), p0, p1);
    svg.transition().duration(500).call(zoom.value.transform, t1);
};

// 监听窗口大小变化，更新宽高
const onResize = () => {
    width.value = window.innerWidth;
    height.value = window.innerHeight;
};

const isHightlight = (attr) => {
    return state.hoveredElementId === attr.id || state.hoveredGroup.includes(attr.id);
}

onMounted(() => {
    const svg = d3.select(mapSvg.value);
    const g = d3.select(map.value);

    // 初始化 d3.zoom
    zoom.value = d3.zoom().on("zoom", (e) => {
        g.attr("transform", e.transform.toString());
    });
    svg.call(zoom.value)
        .call(
            zoom.value.transform,
            d3.zoomIdentity
                .translate(translateX.value, translateY.value)
                .scale(scale.value)
        );

    window.addEventListener("resize", onResize);
});


onUnmounted(() => {
    window.removeEventListener("resize", onResize);
});
</script>

<style scoped>
text {
    pointer-events: none;
}

/* 通用容器 */
.svg-plotter-container {
    position: absolute;
    top: 0;
    left: 25vw;
    width: 50vw;
    height: 100%;
    overflow: visible;
    z-index: 0;
    font-family: Arial, sans-serif;
}

/* SVG 地图 */
.svg-plotter-container svg {
    position: absolute;
    left: -25vw;
    top: 0;
    width: 100vw;
    height: 100vh;
    cursor: grab;
}

.svg-plotter-container svg:active {
    cursor: grabbing;
}

/* 底图效果 */
.base-map {
    /* filter: grayscale(100%); */
}

/* 高亮样式 */
path.highlight {
    cursor: pointer;
    stroke: red !important;
    stroke-width: 3 !important;
}

circle.highlight {
    stroke: red !important;
    fill: red !important;
    stroke-width: 3 !important;
    cursor: pointer;
}

.circular-curcor {
    cursor: url('@/assets/mouse.png') 10 10, pointer;
}


/* 控制面板容器 */
.control-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}

/* 控制按钮通用样式 */
.ctrl-group {
    background: #fff;
    border-radius: 4px;
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
    z-index: 2;
}

.ctrl-group button {
    display: block;
    width: 4vh;
    height: 4vh;
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
    outline: none;
}

.ctrl-group button+button {
    border-top: 1px solid #ddd;
}

.ctrl-group button:first-child {
    border-radius: 4px 4px 0 0;
}

.ctrl-group button:last-child {
    border-radius: 0 0 4px 4px;
}

/* 控制按钮图标 */
.icon {
    display: block;
    width: 100%;
    height: 100%;
    background-position: center;
    background-repeat: no-repeat;
}

.ctrl-zoom-in .icon {
    background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%23333' viewBox='0 0 29 29'%3E%3Cpath d='M14.5 8.5c-.75 0-1.5.75-1.5 1.5v3h-3c-.75 0-1.5.75-1.5 1.5S9.25 16 10 16h3v3c0 .75.75 1.5 1.5 1.5S16 19.75 16 19v-3h3c.75 0 1.5-.75 1.5-1.5S19.75 13 19 13h-3v-3c0-.75-.75-1.5-1.5-1.5z'/%3E%3C/svg%3E");
}

.ctrl-zoom-out .icon {
    background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%23333' viewBox='0 0 29 29'%3E%3Cpath d='M10 13c-.75 0-1.5.75-1.5 1.5S9.25 16 10 16h9c.75 0 1.5-.75 1.5-1.5S19.75 13 19 13h-9z'/%3E%3C/svg%3E");
}

/* 控制面板定位 */
.ctrl-bottom-right,
.ctrl-top-right {
    position: absolute;
    right: 1em;
    z-index: 2;
}

.ctrl-bottom-right {
    bottom: 1em;
}

.ctrl-top-right {
    top: 1em;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5em;
}

/* 指北针 */
.compass-label {
    font-size: 3vh;
    color: #333;
}

.compass-subtext {
    margin-top: -1vh;
    margin-bottom: -1vh;
}

.compass-img {
    width: 7vh;
    height: 7vh;
}
</style>
