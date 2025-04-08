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
