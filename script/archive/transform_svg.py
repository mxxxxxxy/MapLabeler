# 输入svg文件和元素名字列表，输出三组数据：点的坐标，线的坐标，多边形的坐标
import xml.etree.ElementTree as ET
import re

def get_coordinates(path):
    # input an svg path string like "M421.5 850L418.5 750L485.5 747L481.5 635.5L496 628V592.5L627.5 587.5L630 622L647 631.5L654 855L431 864.5V850H421.5Z"
    # output a list of coordinates like [(421.5, 850), (418.5, 750), ...]
    commands = re.findall(r'[MmLlHhVvZz][-+0-9\.\s]+', path)  # Extract commands and their arguments
    points = []
    current_x, current_y = None, None  # Track last known position
    
    for command in commands:
        cmd = command[0]
        numbers = list(map(float, re.findall(r'[-+]?[0-9]*\.?[0-9]+', command)))
        
        if cmd in 'MmLl':  # Move or Line commands
            for i in range(0, len(numbers), 2):
                current_x, current_y = numbers[i], numbers[i + 1]
                points.append([current_x, current_y])
        elif cmd in 'Hh':  # Horizontal line
            for x in numbers:
                current_x = x if cmd == 'H' else current_x + x
                points.append([current_x, current_y])
        elif cmd in 'Vv':  # Vertical line
            for y in numbers:
                current_y = y if cmd == 'V' else current_y + y
                points.append([current_x, current_y])
        elif cmd in 'Zz':  # Close path (optional, does not add points)
            pass
    
    return points
    


if __name__ == '__main__':
    svg_path = '东南门附近地图.svg'
    area_name_list = ['邱德拔体育馆', '治贝子园', '理科五号楼', '理科一号楼', '理科二号楼', '英杰交流中心', '第二教学楼', '第四教学楼', '第三教学楼']
    line_name_list = ['中关村北大街', '教学楼南侧道路', '教学楼东侧道路', '理科二号楼东侧道路', '理科二号楼门前道路', '英杰交流中心门前道路', '东南门里侧道路', '教学楼西侧道路', '邱德拔体育馆东侧道路', '邱德拔体育馆南侧道路', '邱德拔体育馆北侧道路', '理科五号楼南侧道路']
    point_name_list = ['东南门', '智能学院', '健身中心']
    areas, lines, points = {}, {}, {}

    # read svg file
    tree = ET.parse(svg_path)
    root = tree.getroot()
    ns = {'svg': 'http://www.w3.org/2000/svg'}
    # find all path elements
    all_paths = root.findall('.//svg:path', ns)
    all_points = root.findall('.//svg:circle', ns)
    
    for i in range(len(area_name_list)):
        name = area_name_list[i]
        # extract all coordinates in the path
        path_element = all_paths[i]
        path_data = path_element.get('d')
        areas[name] = get_coordinates(path_data)

    for i in range(len(line_name_list)):
        name = line_name_list[i]
        # extract all coordinates in the path
        path_element = all_paths[i + len(area_name_list)]
        path_data = path_element.get('d')
        lines[name] = get_coordinates(path_data)

    for i in range(len(point_name_list)):
        name = point_name_list[i]
        # extract all coordinates in the path
        path_element = all_points[i]
        x = float(path_element.get('cx'))
        y = float(path_element.get('cy'))
        points[name] = [x, y]

    for name, coords in areas.items():
        print(f"\'{name}\': {coords},")
    for name, coords in lines.items():
        print(f"\'{name}\': {coords},")
    for name, coords in points.items():
        print(f"\'{name}\': {coords},")