<template>
    <div class="layer-manager"
        :style="{ height: expandedList ? height + 'px' : '3em', width: width + 'px', left: left + 'px', top: top + 'px' }">
        <span class="subtitle">地图图层列表</span>
        <hr style="margin: 0; border: none; border-top: 1px solid #ccc" />
        <button @click="expandedList = !expandedList" class="toggle-btn">
            <i :class="expandedList ? 'fa fa-angle-down' : 'fa fa-angle-up'"></i>
        </button>
        <div class="layer-list" v-show="expandedList">
            <ul>
                <li v-for="(layer, key) in layers" :key="key">
                    <span class="icon">
                        <i :class="getVisibilityIcon(layer.visibleKey)" @click="toggleVisibility(layer.visibleKey)"></i>
                    </span>
                    <span class="layer-name">
                        {{ layer.label }}
                        <i v-if="layer.children" :class="expandedLayers[key] ? 'fa fa-angle-down' : 'fa fa-angle-right'"
                            @click="toggleExpand(key)"></i>
                    </span>
                    <ul v-if="layer.children && expandedLayers[key]">
                        <li v-for="(d, name) in layer.children" :key="d.id" :ref="(el) => setElementRef(d, el)"
                            :class="{ hovered: state.hoveredElement === d.id }" @mouseenter="hoverElement(d.id)"
                            @mouseleave="hoverElement(null)" @click="state.focusedElementId = d.id">
                            {{ d.id }}
                            <div>
                                <span class="icon">
                                    <i :class="getVisibilityIcon(layer.visibleKey)"
                                        @click="toggleVisibility(layer.visibleKey)"></i>
                                </span>
                            </div>
                        </li>
                    </ul>
                </li>
            </ul>
        </div>
    </div>
</template>

<script setup>
import * as d3 from 'd3'
import { useStoreState, useStoreData } from "@/stores";
import { ref, computed, watch, nextTick } from "vue";

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

const state = useStoreState();
const data = useStoreData();

const expandedList = ref(true);
const expandedLayers = ref({ areas: false, paths: false, points: false });

const layers = computed(() => ({
    baseMap: { label: "底图", visibleKey: "baseMapVisible" },
    wall: { label: "城墙", visibleKey: "wallVisible", children: data.wall },
    water: { label: "水系", visibleKey: "waterVisible", children: data.water },
    building: { label: "城坊", visibleKey: "buildingVisible", children: data.building },
    road: { label: "街道", visibleKey: "roadVisible", children: data.road },
    door: { label: "城门", visibleKey: "doorVisible", children: data.door },
}));

const hoverElement = (name) => { state.hoveredElement = name };

const elementRefs = ref({}); // 记录每个元素的 DOM 参考

const setElementRef = (d, el) => {
    if (el) {
        elementRefs.value[d.id] = el;
    }
};


const getVisibilityIcon = (key) => (state[key] ? "fa fa-eye" : "fa fa-eye-slash");

const toggleVisibility = (key) => {
    state[key] = !state[key];
};

const toggleExpand = (key) => (expandedLayers.value[key] = !expandedLayers.value[key]);

watch(
    () => state.hoveredElement,
    async (newHovered) => {
        d3.select(`[id="${newHovered}"]`).raise()
        if (newHovered) {
            // 查找它属于哪个层级，并展开
            Object.keys(layers.value).forEach((key) => {
                if (layers.value[key].children && newHovered in layers.value[key].children) {
                    expandedLayers.value[key] = true;
                }
            });
            // 等待 DOM 更新后滚动到可视范围内
            await nextTick();
            if (elementRefs.value[newHovered]) {
                elementRefs.value[newHovered].scrollIntoView({ behavior: "smooth", block: "nearest" });
            }
        }
    }
);
</script>

<style>
.layer-manager {
    position: absolute;
    display: flex;
    flex-direction: column;
    overflow: visible;
    z-index: 1;
    top: 10vh;
    left: 1vw;
    height: 85vh;
    width: 20vw;
    padding: 1vh;

    border: 1px solid #ccc;
    background-color: rgba(255, 255, 255, 0.5);
    /* 半透明白色背景 */
    backdrop-filter: blur(10px);
    /* 可选：增加模糊效果，使背景更柔和 */
    border-radius: 10px;
    /* 圆角边框 */
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.3);
    /* 添加阴影 */
    transition: height 0.3s ease;
    /* 添加过渡效果 */
}

.layer-list {
    overflow-y: auto;
}

.layer-list ul {
    list-style: none;
    padding: 0;
    margin: 0;
}

.layer-list li {
    cursor: pointer;
    margin-bottom: 5px;
    padding: 3px;
}

/* .layer-list li:hover {
  background: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 4px;
} */

.layer-list li.hovered {
    background: #f0f0f0;
    border: 1px solid #ccc;
    border-radius: 4px;
}

.layer-list .icon {
    margin-right: 5px;
}

.layer-list ul ul {
    margin-left: 20px;
    margin-top: 5px;
}

button:focus {
    outline: none;
}

.subtitle {
    font-size: 1.2em;
    padding: 0.5em;
    /* 左侧对齐 */
    text-align: left;
    font-weight: bold;
    color: #333;
}

.toggle-btn {
    position: absolute;
    top: 0.5em;
    right: 0;
    background: none;
    border: none;
    cursor: pointer;
}
</style>
