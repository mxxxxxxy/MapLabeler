export const formatLocation = (location:string) => {
  return location
    .split(" ")
    .map((coord) => parseFloat(coord).toFixed(4))
    .join(" ");
};

// 获取地理位置
export const getLocation = () => {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(`${pos.coords.latitude} ${pos.coords.longitude}`),
      () => resolve(null)
    );
  });
};

export const extract_coordinate = (element:SVGSVGElement):[number,number] => {
  const tag = element.tagName.toLowerCase();
  if (tag === "circle") {
    return [
      parseFloat(element.getAttribute("cx")),
      parseFloat(element.getAttribute("cy")),
    ];
  } else if (tag === "polyline") {
    const points = element.getAttribute("points").split(" ");
    const mid_idx = Math.floor(points.length / 2);
    const [x, y] = points[mid_idx].split(",");
    return [parseFloat(x), parseFloat(y)];
  } else if (tag === "polygon") {
    const points = element.getAttribute("points").split(" ");
    const xs = points.map((p) => parseFloat(p.split(",")[0]));
    const ys = points.map((p) => parseFloat(p.split(",")[1]));
    return [
      xs.reduce((a, b) => a + b) / xs.length,
      ys.reduce((a, b) => a + b) / ys.length,
    ];
  }
};

export const projectCoordinates = (lon:number, lat:number):[number,number] => {
  // 线性映射，将经纬度坐标转换为 SVG 坐标
  // 示例中使用了固定参数，你可根据实际底图参数调整
  const x =
    ((lon - 116.30950927734375) * 2048) /
    (116.32049560546875 - 116.30950927734375);
  const y =
    ((39.99290359080193 - lat) * 1536) /
    (39.99290359080193 - 39.98659063142852);
  return [x, y];
};

export const exportSVG = (svg: SVGElement) => {
    console.log(svg)
    // 获取SVG数据
    const svgData = new XMLSerializer().serializeToString(svg);
    
    // 创建Blob对象
    const canvasBlob = new Blob([svgData], { type: 'image/svg+xml' });
    
    // 创建下载链接
    const downloadUrl = URL.createObjectURL(canvasBlob);
    
    // 创建并触发点击事件
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'exported-svg.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 清理对象URL
    URL.revokeObjectURL(downloadUrl);
}
