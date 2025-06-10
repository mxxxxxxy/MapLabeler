<template>

</template>


<script setup>
import * as d3 from "d3";

const addTrajectoryDSL = (dsl, gElement) => {
  const trajectory = dsl.paras.trajectory;
  // [{stay_location: "", approximate:false, text: ""},
  // {move_from: {location:"", approximate:false}, move_to: {location:"", approximate:false}, text: ""},...]
  trajectory.forEach((item) => {
    const svgContainer = d3.select(map.value);
    const g = d3.select(gElement);
    if (item.stay_location) {  // 停留
      const targetElement = svgContainer.select(`#${item.stay_location}`).node();
      if (!targetElement) {
        alert("未找到停留位置：" + item.stay_location);
        return;
      }
      const tagName = targetElement.tagName.toLowerCase();
      if (tagName === "circle") {
        const cx = targetElement.getAttribute("cx");
        const cy = targetElement.getAttribute("cy");
        const r = parseFloat(targetElement.getAttribute("r"));
        if (item.approximate) {
          g.append("circle")
            .attr("cx", cx)
            .attr("cy", cy)
            .attr("r", r * 3)
            .attr("fill", "none")
            .attr("stroke", "rgb(31, 77, 122)")
            .attr("stroke-width", 3)
            .attr("stroke-dasharray", "5,5")
        } else {
          g.append("circle")
          .attr("cx", cx)
          .attr("cy", cy)
          .attr("r", r * 1.5)
          .attr("fill", "rgb(31, 77, 122)");
        }
      } else if (tagName === "polygon") {
        const points = targetElement.getAttribute("points");
        g.append("polygon")
          .attr("points", points)
          .attr("fill", "none")
          .attr("stroke", "rgb(31, 77, 122)")
          .attr("stroke-width", 3);
      }
    } else if (item.move_from && item.move_to) {  // 移动
      const location_from = item.move_from.location;
      const approx_from = item.move_from.approximate;
      const location_to = item.move_to.location;
      const approx_to = item.move_to.approximate;
      if (!location_from && !location_to) {  // 起点和终点不能都为空
        console.warn("移动轨迹缺少起点和终点位置");
        return;
      }
      // 如果 defs 不存在则添加
      let defs = svgContainer.select("defs");
      if (defs.empty()) {
        defs = svgContainer.insert("defs", ":first-child");
      }
      // 添加 marker
      let marker = defs.select("#trajhead");
      if (marker.empty()) {
        marker = defs
          .append("marker")
          .attr("id", "trajhead")
          .attr("markerWidth", 6)
          .attr("markerHeight", 6)
          .attr("refX", 3)
          .attr("refY", 3)
          .attr("orient", "auto");
        marker.append("path").attr("d", "M0,0 L0,6 L6,3 z").attr("fill", "rgb(31, 77, 122)");
      }
      let markerRed = defs.select("#trajhead_red");  // 红色箭头，高亮用
      if (markerRed.empty()) {
        const originalNode = defs.select("#trajhead").node();
        const clonedNode = originalNode.cloneNode(true); // 深度克隆，包括 path
        clonedNode.id = "trajhead_red"; // 改 ID
        // 替换 path 填色
        d3.select(clonedNode)
          .select("path")
          .attr("fill", "red");
        defs.node().appendChild(clonedNode); // 加入 defs
      }
      if (!location_from) {  // 起点为空，根据终点向上移动补全
        const targetElement = svgContainer.select(`#${location_to}`).node();
        let cx_to, cy_to;
        [cx_to, cy_to] = extract_coordinate(targetElement);
        const bbox = targetElement.getBBox();
        cy_to = bbox.y; // 上边缘
        if (approx_to && targetElement.tagName.toLowerCase() === "circle") {  // 如果是近似点位置，向上移动一点
          const r = parseFloat(targetElement.getAttribute("r"));
          cy_to -= r * 1.5;
        }
        g.append("path")  // 绘制指向target的箭头
          .attr("class", "trajectory-arrow")
          .attr("d", `M ${cx_to} ${cy_to - 50} L ${cx_to} ${cy_to-8} `)
          .attr("stroke", "rgb(31, 77, 122)")
          .attr("stroke-width", 3)
          .attr("marker-end", "url(#trajhead)");
      } else if (!location_to) {  // 终点为空，根据起点向下移动补全
        const targetElement = svgContainer.select(`#${location_from}`).node();
        let cx_from, cy_from;
        [cx_from, cy_from] = extract_coordinate(targetElement);
        const bbox = targetElement.getBBox();
        cy_from = bbox.y + bbox.height; // 下边缘
        if (approx_from && targetElement.tagName.toLowerCase() === "circle") {  // 如果是近似点位置，向下移动一点
          const r = parseFloat(targetElement.getAttribute("r"));
          cy_from += r * 1.5;
        }
        g.append("path")  // 绘制从target出发的箭头
          .attr("class", "trajectory-arrow")
          .attr("d", `M ${cx_from} ${cy_from} L ${cx_from} ${cy_from + 50} `)
          .attr("stroke", "rgb(31, 77, 122)")
          .attr("stroke-width", 3)
          .attr("marker-end", "url(#trajhead)");
      } else {  // 起点和终点都有。对于区域，计算起点到终点连线与区域边界的交点；如果是近似点位置，延连线方向缩短
        const targetElementFrom = svgContainer.select(`#${location_from}`).node();
        const targetElementTo = svgContainer.select(`#${location_to}`).node();
        let cx_from, cy_from, cx_to, cy_to;
        [cx_from, cy_from] = extract_coordinate(targetElementFrom);
        [cx_to, cy_to] = extract_coordinate(targetElementTo);
        [cx_from, cy_from] = adjust_location(cx_from, cy_from, cx_to, cy_to, approx_from, targetElementFrom);
        [cx_to, cy_to] = adjust_location(cx_to, cy_to, cx_from, cy_from, approx_to, targetElementTo);
        
        // 绘制从起点到终点的曲线箭头
        const midX = (cx_from + cx_to) / 2;
        const midY = (cy_from + cy_to) / 2;
        const dx = cx_to - cx_from, dy = cy_to - cy_from;
        const curveFactor = 0.2; // 调整曲率
        const cpX = midX - dy * curveFactor;
        const cpY = midY + dx * curveFactor;
        g.append("path")  
          .attr("class", "trajectory-arrow")
          .attr("d", `M ${cx_from} ${cy_from} Q ${cpX} ${cpY} ${cx_to} ${cy_to}`)
          .attr("stroke", "rgb(31, 77, 122)")
          .attr("stroke-width", 3)
          .attr("fill", "none")
          .attr("marker-end", "url(#trajhead)");
      }
    }
  });
}
</script>