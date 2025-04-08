<template>
  <div class="svg-plotter-container" :style="{ height: containerHeight + 'px', width: containerWidth + 'px', left: left + 'px', top: top + 'px' }">
    <!-- 控制面板 -->
    <div class="control-container">
      <div class="ctrl-bottom-right">
        <div class="ctrl-group">
          <button
            class="ctrl-zoom-in"
            type="button"
            aria-label="Zoom in"
            @click="zoomIn"
          >
            <span class="icon" aria-hidden="true" title="放大"></span>
          </button>
          <button
            class="ctrl-zoom-out"
            type="button"
            aria-label="Zoom out"
            @click="zoomOut"
          >
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
      <rect width="100%" height="100%" fill="#e8e8e8" />
      <!-- 缩放&平移容器 -->
      <g id="map-container" ref="map">
        <!-- 底图 -->
        <g v-if="state.baseMapVisible">
          <image
            class="base-map"
            href="/merged_map_gaode.png"
            x="0"
            y="0"
            width="2048"
            height="1536"
          />
        </g>

        <!-- 区域 -->
        <g class="areas" v-if="state.areasVisible">
          <polygon
            v-for="(points, name) in data.areaCoordinates"
            :key="name"
            :id="name"
            :points="formatPoints(points)"
            stroke="rgba(107,203,215,1)"
            fill="rgba(228,243,246,0.9)"
            stroke-width="2"
            :class="{ highlight: state.hoveredElement === name }"
            @mouseover="state.hoveredElement = name"
            @mouseout="state.hoveredElement = null"
            @click="state.focusedElementId = name"
          />
        </g>

        <!-- 路径 -->
        <g class="paths" v-if="state.pathsVisible">
          <template v-for="(points, name) in data.pathData" :key="name">
            <polyline
              :id="name"
              :points="formatPoints(points)"
              stroke="rgba(107,203,215,1)"
              fill="none"
              :stroke-width="name === '中关村北大街' ? 10 : 5"
              :class="{ highlight: state.hoveredElement === name }"
              @mouseover="state.hoveredElement = name"
              @mouseout="state.hoveredElement = null"
              @click="state.focusedElementId = name"
            />
            <!-- 内部描边 -->
            <path
              :id="`${name}-inner`"
              :d="formatPathD(points)"
              stroke="white"
              fill="none"
              :stroke-width="name === '中关村北大街' ? 7 : 3"
              stroke-linecap="round"
              stroke-linejoin="round"
              :class="{ highlight: state.hoveredElement === name }"
              @mouseover="state.hoveredElement = name"
              @mouseout="state.hoveredElement = null"
              @click="state.focusedElementId = name"
            />
          </template>
        </g>

        <!-- 地点 -->
        <g class="points" v-if="state.pointsVisible">
          <circle
            v-for="(coord, name) in data.pointCoordinates"
            :key="name"
            :id="name"
            :cx="coord[0]"
            :cy="coord[1]"
            r="8"
            fill="rgba(107,203,215,1)"
            :class="{ highlight: state.hoveredElement === name }"
            @mouseover="state.hoveredElement = name"
            @mouseout="state.hoveredElement = null"
            @click="state.focusedElementId = name"
          />
        </g>
      </g>
    </svg>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from "vue";
import * as d3 from "d3";
import { useStoreState, useStoreData } from "@/stores";
import { projectCoordinates, extract_coordinate } from "@/utils";
import vegaEmbed from "vega-embed";

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
const scale = ref(0.85768);
const translateX = ref(23.2523);
const translateY = ref(-300.932);



// 保存 d3.zoom 实例
// let zoom = d3.zoom();
const zoom = ref(d3.zoom());

// svg ref 用于获取 DOM 节点
const map = ref(null);
const mapSvg = ref(null);

// 工具函数：格式化点数组为 polyline 的 points 属性
const formatPoints = (points) =>
  points.map((coord) => coord.join(",")).join(" ");

// 工具函数：格式化点数组为 path 的 d 属性
const formatPathD = (points) =>
  points
    .map((coord, i) => `${i === 0 ? "M" : "L"}${coord[0]},${coord[1]}`)
    .join(" ");

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

// 内部辅助函数：用于将视图缩放到指定的边界框
function zoomToBbox(bbox) {
  const r = 1;
  if (bbox.width / bbox.height >  containerWidth.value /  containerHeight.value) {
    const scale =  containerWidth.value / bbox.width * r;
    const dx = left.value;
    const dy = ( containerHeight.value - bbox.height * scale) / 2;
    const offsetX = -bbox.x * scale + dx;
    const offsetY = -bbox.y * scale + dy;
    d3.select(mapSvg.value)
    .transition()
    .duration(500)
    .call(zoom.value.transform, d3.zoomIdentity.translate(offsetX, offsetY).scale(scale));
    return;
  } else {
    const scale =  containerHeight.value / bbox.height * r;
    const dx = ( containerWidth.value - bbox.width * scale) / 2+ left.value;
    const dy = 0;
    const offsetX = -bbox.x * scale + dx;
    const offsetY = -bbox.y * scale + dy;
    d3.select(mapSvg.value)
    .transition()
    .duration(500)
    .call(zoom.value.transform, d3.zoomIdentity.translate(offsetX, offsetY).scale(scale));
  }
}

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

// 绘图相关函数
const addDSL = (gElement, dsls) => {
  dsls.forEach((dsl) => {
    switch (dsl.type) {
      case "State":
        addStateDSL(dsl, gElement);
        break;
      case "Geography":
        addGeographyDSL(dsl, gElement);
        break;
      case "Trend":
        addTrendDSL(dsl, gElement);
        break;
      case "TextBox":
        addTextBoxDSL(dsl, gElement);
        break;
      case "Image":
        addImageDSL(dsl, gElement);
        break;
      case "VegaLite":
        addVegaLiteDSL(dsl, gElement);
        break;
      default:
        alert("不支持的DSL类型：" + dsl.type);
    }
  });
};

const addStateDSL = (dsl, gElement) => {
  const { target } = dsl.paras;
  const svgContainer = d3.select(map.value);
  const targetElement = svgContainer.select(`#${target}`).node();
  if (!targetElement) {
    alert("未找到情报对象：" + target);
    return;
  }
  const randomId = Math.random().toString(36).substring(7);
  const g = d3.select(gElement);
  const tagName = targetElement.tagName.toLowerCase();

  if (tagName === "circle") {
    // 读取属性
    const cx = targetElement.getAttribute("cx");
    const cy = targetElement.getAttribute("cy");
    const r = parseFloat(targetElement.getAttribute("r"));
    // 创建强调圆
    g.append("circle")
      .attr("class", "highlighter")
      .attr("cx", cx)
      .attr("cy", cy)
      .attr("r", r * 1.5)
      .attr("stroke", "rgba(232,159,91,1)")
      .attr("stroke-width", 3)
      .attr("fill", "none");
  } else if (tagName === "polyline") {
    // 获取内部元素（假设其 id 为 target + '-inner'）
    const innerElement = svgContainer.select(`#${target}-inner`).node();
    if (innerElement) {
      const points = innerElement.getAttribute("d");
      g.append("path")
      .attr("class","highlighter")
        .attr("d", points)
        .attr("stroke", "rgba(232,159,91,1)")
        .attr("fill", "none")
        .attr("stroke-width", 3)
        .attr("id", target + randomId);
    }
  } else if (tagName === "polygon") {
    const points = targetElement.getAttribute("points");
    g.append("polygon")
      .attr("class", "highlighter")
      .attr("points", points)
      .attr("stroke", "rgba(232,159,91,1)")
      .attr("fill", "rgba(255,165,0,0.3)")
      .attr("stroke-width", 2);
  }

  // 展示目标名称
  const text = g.append("text").attr("fill", "white");
  if (tagName === "circle" || tagName === "polygon") {
    const [cx_text, cy_text] = extract_coordinate(targetElement);
    text.attr("x", cx_text).attr("y", cy_text).attr("dx", 20).text(target);
  } else if (tagName === "polyline") {
    text.attr("dy", -15);
    const textPath = text
      .append("textPath")
      .attr("href", "#" + target + randomId)
      .attr("startOffset", "50%")
      .text(target);
  }
  requestAnimationFrame(() => {
    const bbox = text.node().getBBox();
    g.insert("rect", () => text.node())
      .attr("x", bbox.x - 5)
      .attr("y", bbox.y - 5)
      .attr("width", bbox.width + 10)
      .attr("height", bbox.height + 10)
      .attr("fill", "orange");
  });
};

const addGeographyDSL = (dsl, gElement) => {
  const { target_1, target_2, direction, distance } = dsl.paras;
  const svgContainer = d3.select(map.value);
  const elem1 = svgContainer.select(`#${target_1}`).node();
  const elem2 = svgContainer.select(`#${target_2}`).node();
  if (!elem1 || !elem2) {
    alert("一个或两个情报对象未找到：" + target_1 + "，" + target_2);
    return;
  }
  const [cx1, cy1] = extract_coordinate(elem1);
  const [cx2, cy2] = extract_coordinate(elem2);
  const g = d3.select(gElement);
  // 如果 defs 不存在则添加
  let defs = svgContainer.select("defs");
  if (defs.empty()) {
    defs = svgContainer.insert("defs", ":first-child");
  }
  // 添加 marker
  let marker = defs.select("#arrowhead");
  if (marker.empty()) {
    marker = defs
      .append("marker")
      .attr("id", "arrowhead")
      .attr("markerWidth", 8)
      .attr("markerHeight", 6)
      .attr("refX", 4)
      .attr("refY", 3)
      .attr("orient", "auto");
    marker.append("path").attr("d", "M0,0 L0,6 L8,3 z").attr("fill", "purple");
  }
  const randomId = Math.random().toString(36).substring(7);
  // 画直线
  g.append("path")
    .attr("class","arrow")
    .attr("d", `M ${cx1} ${cy1} L ${cx2} ${cy2}`)
    .attr("stroke", "purple")
    .attr("stroke-width", 3)
    .attr("marker-end", "url(#arrowhead)")
    .attr("id", target_1 + randomId);

  // 添加中点文字
  const midX = (cx1 + cx2) / 2;
  const midY = (cy1 + cy2) / 2;
  const text = g
    .append("text")
    .attr("fill", "purple")
    .attr("dy", -10)
    .attr("text-anchor", "middle");
  if (cx1 > cx2) {
    text.attr("transform", `rotate(180 ${midX} ${midY})`);
  }
  text
    .append("textPath")
    .attr("href", "#" + target_1 + randomId)
    .attr("startOffset", "50%")
    .text(`${direction || ""} ${distance || ""}`);
};

const addTrendDSL = (dsl, gElement) => {
  const { target_1, target_2, info } = dsl.paras;
  const svgContainer = d3.select(map.value);
  const elem1 = svgContainer.select(`#${target_1}`).node();
  const elem2 = svgContainer.select(`#${target_2}`).node();
  if (!elem1 || !elem2) {
    alert("一个或两个情报对象未找到：" + target_1 + "，" + target_2);
    return;
  }
  const [cx1, cy1] = extract_coordinate(elem1);
  const [cx2, cy2] = extract_coordinate(elem2);
  const midX = (cx1 + cx2) / 2;
  const midY = (cy1 + cy2) / 2;
  const dx = cx2 - cx1,
    dy = cy2 - cy1;
  const curveFactor = 0.2;
  const cpX = midX - dy * curveFactor;
  const cpY = midY + dx * curveFactor;
  const g = d3.select(gElement);
  const randomId = Math.random().toString(36).substring(7);
  // 创建曲线路径
  const pathD = `M ${cx1} ${cy1} Q ${cpX} ${cpY} ${cx2} ${cy2}`;
  const pathSelection = g
    .append("path")
    .attr("class", "trend-arrow")
    .attr("d", pathD)
    .attr("stroke", "blue")
    .attr("fill", "none")
    .attr("stroke-width", 3)
    .attr("id", target_1 + randomId);

  // 添加移动箭头动画
  const movingMarker = g
    .append("path")
    .attr("d", "M0,-6 L0,6 L14,0 z")
    .attr("fill", "blue");
  movingMarker
    .append("animateMotion")
    .attr("dur", "4s")
    .attr("repeatCount", "indefinite")
    .attr("rotate", "auto")
    .append("mpath")
    .attr("xlink:href", "#" + target_1 + randomId);

  // 创建 marker（若不存在）
  let defs = svgContainer.select("defs");
  if (defs.empty()) {
    defs = svgContainer.insert("defs", ":first-child");
  }
  let marker = defs.select("#arrowheadTrend");
  if (marker.empty()) {
    marker = defs
      .append("marker")
      .attr("id", "arrowheadTrend")
      .attr("markerWidth", 8)
      .attr("markerHeight", 6)
      .attr("refX", 4)
      .attr("refY", 3)
      .attr("orient", "auto");
    marker.append("path").attr("d", "M0,0 L0,6 L8,3 z").attr("fill", "blue");
  }
  // 将 marker 绑定到路径末端
  pathSelection.attr("marker-end", "url(#arrowheadTrend)");

  // 在线上中点添加信息文字
  const curveCenterX = (cx1 + 2 * cpX + cx2) / 4;
  const curveCenterY = (cy1 + 2 * cpY + cy2) / 4;
  const textD3 = g
    .append("text")
    .attr("fill", "blue")
    .attr("dy", -10)
    .attr("text-anchor", "middle");
  if (cx1 > cx2) {
    textD3.attr("transform", `rotate(180 ${curveCenterX} ${curveCenterY})`);
  }
  textD3
    .append("textPath")
    .attr("href", "#" + target_1 + randomId)
    .attr("startOffset", "50%")
    .text(info);
};

const addTextBoxDSL = (dsl, gElement) => {
  const { target, text } = dsl.paras;
  const svgContainer = d3.select(map.value);
  const targetElement = svgContainer.select(`#${target}`).node();
  if (!targetElement) {
    alert("未找到情报目标：" + target);
    return;
  }
  const [cx, cy] = extract_coordinate(targetElement);
  const g = d3.select(gElement);
  const boxX = cx + 10,
    boxY = cy + 20,
    padding = 5;
  // 添加文字
  const textD3 = g
    .append("text")
    .attr("x", boxX + padding)
    .attr("y", boxY + padding + 15)
    .attr("fill", "black")
    .text(text);

  // 在下一帧中获取文字 BBox 并添加多边形背景
  requestAnimationFrame(() => {
    const bbox = textD3.node().getBBox();
    const rightX = boxX + bbox.width + 2 * padding;
    const bottomY = boxY + bbox.height + 2 * padding;
    g.insert("path", function () {
      return textD3.node();
    })
      .attr("class", "box")
      .attr(
        "d",
        `M ${cx} ${cy} L ${rightX} ${boxY} L ${rightX} ${bottomY} L ${boxX} ${bottomY} Z`
      )
      .attr("fill", "rgba(160, 160, 160, 0.6)");
  });
};

const addImageDSL = (dsl, gElement) => {
  const { lat, lon, imageUrl } = dsl.paras;
  // 使用 projectCoordinates 将经纬度转换为 x, y
  const [x, y] = projectCoordinates(lon, lat);
  const g = d3.select(gElement);
  // 添加图标（文字形式）作为触发器
  const icon = g
    .append("text")
    .attr("x", x)
    .attr("y", y)
    .attr("font-size", 30)
    .attr("text-anchor", "middle")
    .attr("alignment-baseline", "middle")
    .attr("font-family", "FontAwesome")
    .text("\uf03e");

  // 添加图片
  const imageWidth = 200,
    imageHeight = 200,
    offsetX = 20;
  const image = g
    .append("image")
    .attr("href", imageUrl)
    .attr("x", x + offsetX)
    .attr("y", y)
    .attr("width", imageWidth)
    .attr("height", imageHeight)
    .style("display", "block");

  // 添加背景多边形
  const padding = 10;
  const rightX = x + imageWidth + offsetX;
  const bottomY = y + imageHeight;
  g.insert("path", function () {
    return image.node();
  })
    .attr("class", "box")
    .attr(
      "d",
      `M ${x - 20} ${y - 20} L ${rightX + padding} ${y} L ${rightX + padding} ${
        bottomY + padding
      } L ${x} ${bottomY + padding} Z`
    )
    .attr("fill", "rgba(255, 255, 255, 0.6)");

  // 添加点击事件（切换显示与隐藏）
  icon
    .on("click", () => {
      const curDisplay = image.style("display");
      const newDisplay = curDisplay === "none" ? "block" : "none";
      image.style("display", newDisplay);
      // 同时切换背景多边形的显示状态
      const polygon = g.select("path");
      const polyDisplay = polygon.style("display");
      polygon.style("display", polyDisplay === "none" ? "block" : "none");
    })
    .raise(); // 确保图标在最上层

  // 点击图片弹出大图
  image.on("click", () => {
    // 创建模态窗口
    const modal = d3
      .select("body")
      .append("div")
      .style("position", "fixed")
      .style("top", 0)
      .style("left", 0)
      .style("width", "100%")
      .style("height", "100%")
      .style("background-color", "rgba(0, 0, 0, 0.8)")
      .style("z-index", 1000)
      .style("display", "flex")
      .style("justify-content", "center")
      .style("align-items", "center")
      .on("click", () => modal.remove());

    modal
      .append("img")
      .attr("src", imageUrl)
      .style("max-width", "90%")
      .style("max-height", "90%");
  });
};

const addVegaLiteDSL = (dsl, gElement) => {
  const { target, title, spec } = dsl.paras;
  const svgContainer = d3.select(map.value);
  const targetElement = svgContainer.select(`#${target}`).node();
  if (!targetElement) {
    alert("Target element not found: " + target);
    return;
  }
  const [cx, cy] = extract_coordinate(targetElement);
  const g = d3.select(gElement);
  const offsetIcon = 30,
    offsetTitle = 60,
    offsetChart = 70;
  // 添加图标
  const icon = g
    .append("text")
    .attr("x", cx)
    .attr("y", cy + offsetIcon)
    .attr("font-size", 30)
    .attr("text-anchor", "middle")
    .attr("alignment-baseline", "middle")
    .attr("font-family", "FontAwesome")
    .text("\uf080");
  // 添加标题
  g.append("text")
    .attr("x", cx)
    .attr("y", cy + offsetTitle)
    .text(title);
  const safeSpec = JSON.parse(JSON.stringify(spec));
  // 创建一个容器 div 用于渲染 Vega-Lite 图表（注意：此 div 元素不在 SVG 内）
  const specContainer = document.createElement("div");
  vegaEmbed(specContainer, safeSpec, { renderer: "svg" }).then((result) => {
    result.view.toSVG().then((svgString) => {
      // 将字符串转为 DOM 节点
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
      const svgNode = svgDoc.documentElement;
      // 设置位置
      d3.select(svgNode)
        .attr("x", cx)
        .attr("y", cy + offsetChart);
      g.node().appendChild(svgNode);

      // 在图表周围添加背景多边形
      const bbox = svgNode.getBBox();
      const padding = 10;
      const rightX = cx + bbox.width + padding;
      const bottomY = cy + bbox.height + padding + offsetChart;
      g.insert("path", function () {
        return svgNode;
      })
        .attr("class", "box")
        .attr(
          "d",
          `M ${cx - 20} ${cy + 10} L ${rightX} ${
            cy + 10 + offsetChart - offsetIcon
          } L ${rightX} ${bottomY} L ${cx - padding} ${bottomY} Z`
        )
        .attr("fill", "rgba(255, 255, 255, 0.6)");

      // 图表和图标的切换显示
      icon
        .on("click", () => {
          const curDisplay = d3.select(svgNode).style("display");
          const newDisplay = curDisplay === "none" ? "block" : "none";
          d3.select(svgNode).style("display", newDisplay);
          // 同时切换背景多边形的显示
          const polygon = g.select("path");
          const polyDisplay = polygon.style("display");
          polygon.style("display", polyDisplay === "none" ? "block" : "none");
        })
        .raise(); // 确保图标在最上层

      // 点击图表放大显示
      d3.select(svgNode).on("click", () => {
        const modal = d3
          .select("body")
          .append("div")
          .style("position", "fixed")
          .style("top", 0)
          .style("left", 0)
          .style("width", "100%")
          .style("height", "100%")
          .style("background-color", "rgba(0, 0, 0, 0.8)")
          .style("z-index", 1000)
          .style("display", "flex")
          .style("justify-content", "center")
          .style("align-items", "center")
          .on("click", () => modal.remove());
        modal
          .append("div")
          .html(svgString)
          .style("transform", "scale(2)")
          .style("max-width", "90%")
          .style("max-height", "90%");
      });
    });
  });
};

// 绘图相关函数END
// 每次data.annotationList进行变化时，对新加入的dsl调用addDSL
watch(
  () => data.annotationList.length,
  (newLength) => {
    const annotations = data.annotationList.slice(-newLength);
    const svgContainer = d3.select(map.value);
    annotations.forEach((annotation) => {
      const g = svgContainer.append("g");
      g.attr("id", 'annotation-' + annotation.id);
      g.on("mouseover", () => {
        state.hoveredAnnotationId = annotation.id;
      });
      g.on("mouseout", () => {
        state.hoveredAnnotationId = null;
      });
      g.on("click", () => {
        state.focusedElementId = 'annotation-' + annotation.id;
      });
      g.classed("annotation-group", true);
      g.classed(annotation.modality, true);
      addDSL(g.node(), annotation.dsls);
      annotation.group = g.node();
    });
  }
);

watch(()=>state.hoveredAnnotationId, (newId, oldId) => {
  if (oldId!==null) {
    const oldAnno =data.getAnno(oldId);
    const oldG = d3.select(oldAnno.group);
    oldG.selectAll(".highlighter").attr("stroke", "rgba(232,159,91,1)");
    oldG.selectAll(".box").attr("stroke", '');
  }
  if (newId!==null) {
    const newAnno = data.getAnno(newId);
    const newG = d3.select(newAnno.group);

    newG.selectAll(".highlighter").attr("stroke", "red");
    newG.selectAll(".box").attr("stroke", "red").attr("stroke-width", 3);
    
  }
});

watch(()=>state.focusedElementId,()=>{
  if(state.focusedElementId!==null) {
    const focusedElement = d3.select(`#${state.focusedElementId}`);
    const bbox = focusedElement.node().getBBox();
    // 为防止缩放太大，对bbox进行限制
    if(bbox.width<zoomMinWidth){
      bbox.x = bbox.x - (zoomMinWidth-bbox.width)/2;
      bbox.width = zoomMinWidth;
    }
    if(bbox.height<zoomMinHeight){
      bbox.y = bbox.y - (zoomMinHeight-bbox.height)/2;
      bbox.height = zoomMinHeight;
    }
    zoomToBbox(bbox);
    state.focusedElementId = null;
  }
})

onMounted(() => {
  const svg = d3.select(mapSvg.value);
  const g = d3.select(map.value);

  // 初始化 d3.zoom
  zoom.value = d3.zoom().on("zoom", (e) => {
    g.attr("transform", e.transform.toString());
  });
  svg
    .call(zoom.value)
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
  border: 1px solid #ccc;
  cursor: grab;
}

.svg-plotter-container svg:active {
  cursor: grabbing;
}

/* 底图效果 */
.base-map {
  filter: grayscale(100%);
}

/* 高亮样式 */
polygon.highlight,
polyline.highlight {
  stroke: red !important;
  stroke-width: 5 !important;
}

circle.highlight {
  r: 15 !important;
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

.ctrl-group button + button {
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
