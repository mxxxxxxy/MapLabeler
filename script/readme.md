##### Figma标注说明以及数据转换说明

### 整体流程
Figma标注 -> 转换为地图配置文件(json) -> 前端绘制SVG地图 

### Figma标注说明
- 图层1: group
  - 实体1: group
    - text
    - SVGElement: path / circle
  - 实体2: group
    - text
    - SVGElement: path / circle
  - 实体3: group
  - ....
  
每个实体必须包含一个SVG元素和一个text，text为该实体的名称。其中SVG元素的id为该地图实体的名称。
标注后的结果以SVG导出。


### Figma数据转换
1. python unicode_converter.py （需要指定Figma导出的SVG名称，和输出SVG的名称）
   作用：将Figma导出的id转为正常编码
2. 运行convert_rect2path （需要指定SVG名称以及输出的JSON配置名称）
   作用：将Figma中的rect等SVG转为path，并且解析SVG得到JSON配置文件

  