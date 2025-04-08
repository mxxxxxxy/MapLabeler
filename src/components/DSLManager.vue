<template>
  <div class="annotation-manager" :style="{ height: height+'px', width: width+'px', right:right+'px', top: top+'px' }">
    <header class="title-container">
      <span class="subtitle">情报列表</span>
      <span class="info-text">
        截止 {{ currentDate }} 已标注 {{ data.annotationList?.length }} 条情报
      </span>
    </header>
    <hr class="divider" />
    <!-- 情报列表 -->
    <div class="annotation-list" ref="annotationListContainer">
      <div
        v-for="(item, index) in data.annotationList"
        :key="item.id"
        class="annotation-item"
        :class="{ inactive: !item.visible }"
        @click="toggleVisibility(item)"
        @mouseover="state.hoveredAnnotationId = item.id"
        @mouseleave="state.hoveredAnnotationId = null"
      >
        <div class="item-header">
          <span class="item-input">
            <i v-if="item.modality === 'imageUpload'" class="fa fa-image"></i>
            <i v-if="item.modality === 'vegaLiteUpload'" class="fa fa-bar-chart"></i>
            <i v-if="item.modality === 'voiceUpload'" class="fa fa-microphone"></i>
            <span v-if="item.modality === 'textUpload'" class="text-icon">T</span>
            {{ item.input }}
          </span>
          <img
            v-if="item.modality === 'imageUpload'"
            :src="item.dsls[0].paras.imageUrl"
            alt="标注缩略图"
            class="thumbnail"
          />
        </div>
        <hr class="item-divider" />
        <div class="annotation-info">
          <span>来源：{{ item.source }}</span>
          <span>紧急程度：{{ item.importance }}</span>
        </div>
        <div class="annotation-info">
          <span>{{ item.time }}</span>
          <span>地点：{{ formatLocation(item.location) }}</span>
        </div>
      </div>
    </div>
    <!-- 控制按钮 -->
    <div class="control-button-container">
      <button @click="openModal('voiceUpload')" title="语音输入"><i class="fa fa-microphone"></i></button>
      <button @click="openModal('textUpload')" title="文本输入">T</button>
      <button @click="openModal('imageUpload')" title="上传图片"><i class="fa fa-image"></i></button>
      <button @click="openModal('vegaLiteUpload')" title="上传图表"><i class="fa fa-bar-chart"></i></button>
      <!-- 暂时停用保存功能 -->
      <!-- <button @click="saveAnnotations" title="保存"><i class="fa fa-save"></i></button> -->
    </div>
  </div>

  <!-- 模态框，使用 Teleport 将模态框挂载到 body 上 -->
  <teleport to="body">
    <div v-if="showModal" class="modal" @click="clearModalInputs">
      <div class="modal-content" @click.stop>
        <h3>{{ modalTitle }}</h3>
        <!-- 图片上传 -->
        <div v-if="modalType === 'imageUpload'" class="modal-section">
          <input type="file" accept="image/*" @change="onImageSelected" />
          <input type="text" v-model="gpsLat" placeholder="输入纬度" />
          <input type="text" v-model="gpsLon" placeholder="输入经度" />
        </div>
        <!-- Vega-Lite 上传 -->
        <div v-if="modalType === 'vegaLiteUpload'" class="modal-section">
          <input type="file" accept=".json" @change="onVegaLiteSelected" />
          <input type="text" v-model="vegaLiteEntity" placeholder="输入实体名称" />
          <input type="text" v-model="vegaLiteTitle" placeholder="输入图表标题" />
        </div>
        <!-- 文本上传 -->
        <div v-if="modalType === 'textUpload'" class="modal-section">
          <textarea
            v-model="annotationInput"
            placeholder="输入情报文本，按回车键提交"
            ref="annotationTextarea"
            @keypress.enter.prevent="handleSubmit"
          ></textarea>
        </div>
        <!-- 语音上传 -->
        <div v-if="modalType === 'voiceUpload'" class="modal-section">
          <textarea
            v-model="annotationInput"
            placeholder="语音输入情报文本，按回车键提交"
            ref="annotationVoicearea"
            @keypress.enter.prevent="handleSubmit"
          ></textarea>
        </div>
        <!-- 其他输入 -->
        <div class="modal-section">
          <textarea v-model="inputSource" placeholder="输入情报来源"></textarea>
        </div>
        <div class="modal-section" style="margin-left: 10px;">
          <label>紧急程度：</label>
          <select v-model="inputImportance">
            <option value="1">1-普通</option>
            <option value="2">2-紧急</option>
            <option value="3">3-非常紧急</option>
          </select>
        </div>
        <div class="modal-buttons">
          <div class="left-buttons">
            <button v-if="modalType === 'voiceUpload'" @click="toggleRecording">
              <i class="fa" :class="isRecording ? 'fa-stop-circle' : 'fa-microphone'"></i>
            </button>
          </div>
          <div class="right-buttons">
            <button @click="handleSubmit">提交</button>
            <button @click="clearModalInputs">取消</button>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, computed, onMounted,watch } from 'vue';
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { useStoreState, useStoreData } from "@/stores"; 
import {formatLocation,getLocation } from "@/utils"
import * as d3 from 'd3';

const props = defineProps(
  {
    height: {
      type: Number,
      default: 0,
    },
    width: {
      type: Number,
      default: 0,
    },
    right: {
      type: Number,
      default: 0,
    },
    top: {
      type: Number,
      default: 0,
    },
  }
);
const height = computed(() => props.height);
const width = computed(() => props.width);
const right = computed(() => props.right);
const top = computed(() => props.top);

// 初始化 OpenAI 客户端
const client = new OpenAI({ apiKey: import.meta.env.VITE_API_KEY, dangerouslyAllowBrowser: true });

// 定义 DSL 校验 schema
const stateSchema = z.object({
  highlight: z.string().describe('constantly "State"'),
  paras: z.object({
    target: z.string().describe('Name of entity in the input')
  })
});
const geographySchema = z.object({
  geography: z.string().describe('constantly "Geography"'),
  paras: z.object({
    target_1: z.string().describe('Name of referred entity'),
    target_2: z.string().describe('Name of current entity'),
    direction: z.enum(['东', '南', '西', '北', '']),
    distance: z.string().describe('Distance between entity 1 and entity 2, can be empty string')
  })
});
const trendSchema = z.object({
  trend: z.string().describe('constantly "Trend"'),
  paras: z.object({
    target_1: z.string().describe('Name of entity 1'),
    target_2: z.string().describe('Name of entity 2'),
    info: z.string().describe('Information about the trend')
  })
});
const textBoxSchema = z.object({
  textbox: z.string().describe('constantly "TextBox"'),
  paras: z.object({
    target: z.string().describe('Name of entity to be annotated'),
    text: z.string().describe('Text to be displayed')
  })
});
const outputSchema = z.object({ final: z.array(z.union([stateSchema, geographySchema, trendSchema, textBoxSchema])) });

const modalTitleMap = {
  imageUpload: '上传图片',
  vegaLiteUpload: '上传Vega-Lite图表',
  textUpload: '输入情报',
  voiceUpload: '语音输入'
};

// 响应式状态和变量
const annotationInput = ref('');
const isRecording = ref(false);
const recognition = ref(null);
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const imageFile = ref(null);
const gpsLat = ref('');
const gpsLon = ref('');
const vegaLiteFile = ref(null);
const vegaLiteEntity = ref('');
const vegaLiteTitle = ref('');
const showModal = ref(false);
const modalType = ref(null);
const inputSource = ref('');
const inputImportance = ref(1);
const modalTitle = ref('');
const annotationListContainer = ref(null);

//使用store
const state = useStoreState();
const data = useStoreData();

// 假设 textarea 引用通过 template ref 传入
const annotationTextarea = ref(null);
const annotationVoicearea = ref(null);

// 创建一个计算属性，返回当前日期的字符串
const currentDate = computed(() => new Date().toLocaleDateString());

// 辅助函数：获取地图 SVG 容器
const toggleVisibility = (item) => {
      item.visible = !item.visible;
      item.group.style.display = item.visible ? 'block' : 'none';
    }



const saveAnnotations = () => {
  const inputList = data.annotationList.map(item => item.input);
  const dslList = data.annotationList.map(item => item.dsls);

  let blob = new Blob([JSON.stringify(dslList, null)], { type: 'application/json' });
  let url = URL.createObjectURL(blob);
  let link = document.createElement('a');
  link.href = url;
  link.download = 'annotations.json';
  link.click();

  blob = new Blob([JSON.stringify(inputList, null)], { type: 'application/json' });
  url = URL.createObjectURL(blob);
  link = document.createElement('a');
  link.href = url;
  link.download = 'inputs.json';
  link.click();
};

const loadAnnotations = () => {
  const spec_example = {
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    "description": "A simple bar chart example.",
    "data": {
      "values": [
        { "时间段": "上午", "人数": 128 },
        { "时间段": "下午", "人数": 255 },
        { "时间段": "晚上", "人数": 243 }
      ]
    },
    "mark": "bar",
    "encoding": {
      "x": { "field": "人数", "type": "quantitative" },
      "y": { "field": "时间段", "type": "nominal" }
    }
  };

  const defaultData = [
    { input: '邱德拔体育馆在东南门南侧150米', dsls: [{ type: "State", paras: { target: "东南门" } }, { type: "State", paras: { target: "邱德拔体育馆" } }, { type: "Geography", paras: { target_1: "东南门", target_2: "邱德拔体育馆", direction: "南", distance: "150米" } }], modality: 'textUpload', time: '2025/3/31 17:01:12', location: '39.98899700517378 116.30872163338584', source: '地图测距', importance: '1' },
    { input: '第二教学楼中现有约1400人，下个课间预计600人通过教学楼西侧道路离开，400人通过东南门里侧道路离开', dsls: [{ type: "State", paras: { target: "第二教学楼" } }, { type: "State", paras: { target: "教学楼西侧道路" } }, { type: "State", paras: { target: "东南门里侧道路" } }, { type: "TextBox", paras: { target: "第二教学楼", text: "现有约1400人" } }, { type: "Trend", paras: { target_1: "第二教学楼", target_2: "东南门里侧道路", info: "400人" } }, { type: "Trend", paras: { target_1: "第二教学楼", target_2: "教学楼西侧道路", info: "600人" } }], modality: 'voiceUpload', time: '2025/3/31 17:02:22', location: '39.98899700517378 116.30872163338584', source: '第二教学楼监控系统', importance: '1' },
    { input: 'GPS坐标(39.987222, 116.308542)', dsls: [{ type: "Image", paras: { lat: 39.987222, lon: 116.308542, imageUrl: "/image_example.jpg" } }], modality: 'imageUpload', time: '2025/3/31 17:03:02', location: '39.98899700517378 116.30872163338584', source: '手机相机', importance: '1' },
    { input: '健身中心人流量图', dsls: [{ type: "VegaLite", paras: { target: "健身中心", title: "健身中心人流量图", spec: spec_example } }, { type: "State", paras: { target: "健身中心" } }], modality: 'vegaLiteUpload', time: '2025/3/31 17:05:57', location: '39.98899700517378 116.30872163338584', source: '健身中心监控系统', importance: '1' }
  ];

  // const svgContainer = getMapContainer();
  // if (!svgContainer) {
  //   alert('Map container (#map-container) not found!');
  //   return;
  // }

  defaultData.forEach((datum, index) => {
    // const svgns = 'http://www.w3.org/2000/svg';
    // const gElement = document.createElementNS(svgns, 'g');
    // addDSL(svgContainer, gElement, datum.dsl);
    data.annotationList.push({
      id: index,
      input: datum.input,
      dsls: datum.dsls,
      visible: true,
      group: null,
      modality: datum.modality,
      time: datum.time,
      location: datum.location,
      source: datum.source,
      importance: datum.importance,
    });
  });
};


// DSL 解析与绘制
//TODO: 分离解析和绘制逻辑
const handleTextUpload = async () => {
  // 根据 modalType 判断使用哪个 textarea
  const textarea = modalType.value === 'textUpload' ? annotationTextarea.value : annotationVoicearea.value;
  if (textarea) textarea.disabled = true;

  // 调用 OpenAI API
  const GPTResponse = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a helpful map annotator. Please provide the DSL for the following natural language input. Use the following DSL types: State for highlighting each mentioned entity, Geography for direction and distance between two entities, Trend for a movement information between two entities, TextBox for display a text about one entity."
      },
      { role: "user", content: annotationInput.value },
    ],
    response_format: zodResponseFormat(outputSchema, "DSLSchema"),
  });
  const GPTResponseContent = GPTResponse.choices[0].message.content;
  console.log(GPTResponseContent);

  if (textarea) textarea.disabled = false;

  let parsed;
  try {
    // 替换关键字，确保 union 类型中 key 不冲突
    const modifiedResponse = GPTResponseContent
      .replaceAll("highlight", "type")
      .replaceAll("geography", "type")
      .replaceAll("trend", "type")
      .replaceAll("textbox", "type");
    parsed = JSON.parse(modifiedResponse).final;
  } catch (e) {
    alert('Invalid JSON. Please check your DSL input.');
    return;
  }

  const sentences = Array.isArray(parsed) ? parsed : [parsed];
  for (const sentence of sentences) {
    if (!sentence.type || !sentence.paras) {
      alert('Each DSL sentence must contain "type" and "paras" properties.');
      return;
    }
  }

  // const svgContainer = getMapContainer();
  // if (!svgContainer) {
  //   alert('Map container (#map-container) not found!');
  //   return;
  // }
  // const svgns = 'http://www.w3.org/2000/svg';
  // const gElement = document.createElementNS(svgns, 'g');

  // addDSL(svgContainer, gElement, sentences);

  const newItem = {
    id: data.annotationList.length,
    input: annotationInput.value,
    dsls: sentences,
    visible: true,
    group: null,
    modality: modalType.value,
    time: new Date().toLocaleString(),
    location: await getLocation(),
    source: inputSource.value,
    importance: inputImportance.value,
  };
  data.annotationList.push(newItem);
  annotationInput.value = '';
};

const handleImageUpload = async () => {
  if (!imageFile.value || !gpsLat.value || !gpsLon.value) {
    alert("请上传图片并输入GPS坐标");
    return;
  }
  const latVal = parseFloat(gpsLat.value);
  const lonVal = parseFloat(gpsLon.value);
  if (isNaN(latVal) || isNaN(lonVal)) {
    alert("GPS坐标无效");
    return;
  }
  const imageUrl = URL.createObjectURL(imageFile.value);
  // const svgns = 'http://www.w3.org/2000/svg';
  // const gElement = document.createElementNS(svgns, 'g');
  const dsl = { type: "Image", paras: { lat: latVal, lon: lonVal, imageUrl: imageUrl } };
  // addImageDSL(dsl, gElement);
  data.annotationList.push({
    id: data.annotationList.length,
    input: `GPS坐标(${latVal}, ${lonVal})`,
    dsls: [dsl],
    visible: true,
    group: null,
    modality: modalType.value,
    time: new Date().toLocaleString(),
    location: await getLocation(),
    source: inputSource.value,
    importance: inputImportance.value,
  });
  imageFile.value = null;
  gpsLat.value = '';
  gpsLon.value = '';
  showModal.value = false;
};

const handleVegaLiteUpload = async () => {
  if (!vegaLiteFile.value || !vegaLiteEntity.value || !vegaLiteTitle.value) {
    alert("请上传Vega-lite规格数据并输入实体名称和标题");
    return;
  }
  const target = vegaLiteEntity.value;
  const title = vegaLiteTitle.value;
  const reader = new FileReader();
  const location = await getLocation();
  reader.onload = (e) => {
    const vegaLiteSpec = JSON.parse(e.target.result);
    // const svgns = 'http://www.w3.org/2000/svg';
    // const gElement = document.createElementNS(svgns, 'g');
    const vegaLiteDsl = { type: "VegaLite", paras: { target: target, title: title, spec: vegaLiteSpec } };
    const stateDsl = { type: "State", paras: { target: target } };
    // addVegaLiteDSL(vegaLiteDsl, gElement);
    // addStateDSL(stateDsl, gElement);
    data.annotationList.push({
      id: data.annotationList.length,
      input: title,
      dsls: [vegaLiteDsl, stateDsl],
      visible: true,
      group: null,
      modality: modalType.value,
      time: new Date().toLocaleString(),
      location: location,
      source: inputSource.value,
      importance: inputImportance.value,
    });
    vegaLiteFile.value = null;
    vegaLiteEntity.value = '';
    vegaLiteTitle.value = '';
    clearModalInputs();
  };
  reader.readAsText(vegaLiteFile.value);
};

// 语音识别相关
const startRecording = () => {
  if (!SpeechRecognition) {
    console.error("当前浏览器不支持 Web Speech API");
    return;
  }
  recognition.value = new SpeechRecognition();
  recognition.value.lang = "zh-CN";
  recognition.value.continuous = true;
  recognition.value.interimResults = false;
  recognition.value.maxAlternatives = 1;
  recognition.value.onstart = () => {
    isRecording.value = true;
  };
  recognition.value.onresult = (event) => {
    annotationInput.value = event.results[0][0].transcript;
  };
  recognition.value.onerror = (error) => {
    console.error("ASR 识别失败:", error);
  };
  recognition.value.onend = () => {
    isRecording.value = false;
    console.warn("语音识别已结束");
  };
  recognition.value.start();
};

const stopRecording = () => {
  if (recognition.value) {
    recognition.value.stop();
    isRecording.value = false;
  }
};

const toggleRecording = () => {
  if (isRecording.value) {
    stopRecording();
  } else {
    startRecording();
  }
};

// 上传图片相关
const onImageSelected = (event) => {
  if (event.target.files.length > 0) {
    imageFile.value = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // 使用 EXIF 库解析图片 GPS 信息，此处需确保 EXIF 库已引入
        EXIF.getData(img, () => {
          const lat = EXIF.getTag(img, "GPSLatitude");
          const lon = EXIF.getTag(img, "GPSLongitude");
          if (lat && lon) {
            const gpslat = lat[0] + lat[1] / 60 + lat[2] / 3600;
            const gpslon = lon[0] + lon[1] / 60 + lon[2] / 3600;
            gpsLat.value = gpslat;
            gpsLon.value = gpslon;
          }
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(imageFile.value);
  }
};

// 表格（Vega-lite）上传后处理
const onVegaLiteSelected = (event) => {
  if (event.target.files.length > 0) {
    vegaLiteFile.value = event.target.files[0];
  }
};

const handleSubmit = () => {
  switch (modalType.value) {
    case 'imageUpload':
      handleImageUpload().then(() => {
        clearModalInputs();
      });
      break;
    case 'vegaLiteUpload':
      handleVegaLiteUpload();
      break;
    case 'textUpload':
    case 'voiceUpload':
      handleTextUpload().then(() => {
        clearModalInputs();
      });
      break;
    default:
      console.error('Unknown modal type:', modalType.value);
  }
};

const clearModalInputs = () => {
  annotationInput.value = '';
  inputSource.value = '';
  inputImportance.value = 1;
  showModal.value = false;
};

const openModal = (type) => {
  modalType.value = type;
  modalTitle.value = modalTitleMap[type];
  showModal.value = true;
};



// 挂载后加载示例数据
onMounted(() => {
  loadAnnotations();
});

watch(()=>state.hoveredAnnotationId,
  (newHovered,oldHovered) => {
    if(oldHovered!==null)
  {
    const oldIndex = data.annotationId2index.get(oldHovered);
    // 找到annotation-list的第oldIndex个子元素
    const oldAnnotationItem = annotationListContainer.value.children[oldIndex];
    // 设置其hovered为false
    d3.select(oldAnnotationItem).classed('hovered', false);
  }
    if(newHovered!==null)
  {
    const newIndex = data.annotationId2index.get(newHovered);
    // 找到annotation-list的第newIndex个子元素
    const newAnnotationItem = annotationListContainer.value.children[newIndex];
    // 滚动到该元素
    if (newAnnotationItem) {
      newAnnotationItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    // 设置其hovered为true
    d3.select(newAnnotationItem).classed('hovered', true);
  }
  },
);
</script>

<style scoped>
/* 主容器 */
.annotation-manager {
  font-family: sans-serif;
  position: absolute;
  top: 10vh;
  right: 1vw;
  width: 20vw;
  height: 85vh;
  padding: 1vh;
  display: flex;
  flex-direction: column;
  z-index: 1;
  
  background-color: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(10px);
  border: 1px solid #ccc;
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
}

/* 标题与统计 */
.title-container {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.subtitle {
  font-size: 1.2em;
  font-weight: bold;
  color: #333;
  padding: 0.5em 0;
}
.info-text {
  font-size: 0.8em;
  color: #666;
}

/* 分割线 */
.divider {
  margin: 0;
  border: none;
  border-top: 1px solid #ccc;
}

/* 情报列表 */
.annotation-list {
  flex: 4 1 0;
  overflow-y: auto;
  margin-bottom: 10px;
}
.annotation-list > div {
  cursor: pointer;
  padding: 5px;
  margin-top: 5px;
  border: 2px solid #d3d3d3;
  border-radius: 5px;
  transition: background 0.2s;
  white-space: pre-wrap;
}
.annotation-list > div.hovered {
  background: #e0e0e0;
}
.annotation-list > div.inactive {
  opacity: 0.5;
}

/* 条目内信息 */
.annotation-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8em;
}

/* 条目头部 */
.item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
}
.item-input {
  text-align: left;
  max-width: 100%;
}
.item-input .text-icon {
  font-weight: bold;
  margin-right: 5px;
}
.thumbnail {
  max-width: 30%;
  max-height: 50px;
}

/* 控制按钮 */
.control-button-container {
  display: flex;
}
.control-button-container button {
  flex: 1;
  align-self: flex-end;
}

/* 文本输入区域 */
.annotation-input textarea {
  width: 100%;
  height: 100px;
  margin-bottom: 5px;
  font-family: monospace;
}

/* 模态框 */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background: #fff;
  padding: 20px;
  border-radius: 5px;
  width: 20vw;
  max-height: 60vh;
}
.modal-content input,
.modal-content textarea {
  display: block;
  margin: 1em auto;
  width: 90%;
}
.modal-buttons {
  display: flex;
  justify-content: space-between;
  text-align: right;
}
.modal-buttons button {
  margin-left: 10px;
}

/* 全局 textarea 样式 */
textarea {
  resize: none;
  width: 15vw;
  height: 10vh;
}
</style>
