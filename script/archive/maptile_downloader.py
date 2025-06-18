import os
import math
import requests
from PIL import Image
import threading
from queue import Queue
from baidu_coord_transform import pixelToLnglat 

proxies = {
 "http":"127.0.0.1:7890",
 "https": "127.0.0.1:7890"
}

User_Agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.95 Safari/537.36'

class TileDownloader:
    def __init__(self, output_dir="output", max_threads=4):
        self.output_dir = output_dir
        self.max_threads = max_threads
        os.makedirs(output_dir, exist_ok=True)
        
    def download_tile(self, x, y, z, tile_server, retry=3):
        """下载单个瓦片"""
        url = tile_server.format(z=z, x=x, y=y)
        tile_path = os.path.join(self.output_dir, f"tile_{z}_{x}_{y}.png")
        
        if os.path.exists(tile_path):
            return True
            
        try:
            headers = {
                'User-Agent': User_Agent,
                "Cache-Control": "max-age=0",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "Accept-Encoding": "gzip,deflate,br",
                "Accept-Language": "zh-CN,zh;q=0.9",
            }
            r = requests.get(url, headers=headers, timeout=10, proxies=proxies)
            if r.status_code == 200:
                with open(tile_path, 'wb') as f:
                    f.write(r.content)
                return True
            else:
                print(f"下载失败: {url} - 状态码: {r.status_code}")
        except Exception as e:
            print(f"下载失败: {url} - 错误: {str(e)}")
            if retry > 0:
                return self.download_tile(x, y, z, tile_server, retry-1)
        return False
    
    def worker(self, q, tile_server):
        """工作线程函数"""
        while not q.empty():
            x, y, z = q.get()
            self.download_tile(x, y, z, tile_server)
            q.task_done()
    
    def download_tiles_in_range(self, x_min, x_max, y_min, y_max, zoom, tile_server):
        """下载指定XY范围内的所有瓦片"""
        print(f"瓦片范围: x={x_min}-{x_max}, y={y_min}-{y_max}, zoom={zoom}")
        print(f"预计下载瓦片数量: {(x_max-x_min+1)*(y_max-y_min+1)}")
        
        # 创建任务队列
        q = Queue()
        for x in range(x_min, x_max + 1):
            for y in range(y_min, y_max + 1):
                q.put((x, y, zoom))
        
        # 启动多线程下载
        threads = []
        for i in range(min(self.max_threads, q.qsize())):
            t = threading.Thread(target=self.worker, args=(q, tile_server))
            t.start()
            threads.append(t)
        
        # 等待所有任务完成
        q.join()
        for t in threads:
            t.join()
        
        return (x_min, y_min, x_max, y_max, zoom)
    
    def deg2num(self, lat_deg, lon_deg, zoom):
        """将经纬度转换为瓦片坐标"""
        lat_rad = math.radians(lat_deg)
        n = 2.0 ** zoom
        xtile = int((lon_deg + 180.0) / 360.0 * n)
        ytile = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
        return (xtile, ytile)
    
    def num2deg(self, xtile, ytile, zoom):
        """将瓦片坐标转换为经纬度"""
        n = 2.0 ** zoom
        lon_deg = xtile / n * 360.0 - 180.0
        lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * ytile / n)))
        lat_deg = math.degrees(lat_rad)
        return (lat_deg, lon_deg)

    def merge_tiles(self, x_min, y_min, x_max, y_max, zoom, output_file="merged.png"):
        """合并下载的瓦片为一张大图"""
        # 计算图像大小
        tile_size = 256  # 标准瓦片大小
        width = (x_max - x_min + 1) * tile_size
        height = (y_max - y_min + 1) * tile_size
        
        # 创建空白画布
        merged_image = Image.new('RGB', (width, height))
        
        # 逐个粘贴瓦片
        for x in range(x_min, x_max + 1):
            for y in range(y_min, y_max + 1):
                tile_path = os.path.join(self.output_dir, f"tile_{zoom}_{x}_{y}.png")
                if os.path.exists(tile_path):
                    try:
                        tile = Image.open(tile_path)
                        pos_x = (x - x_min) * tile_size
                        pos_y = (y-y_min) * tile_size
                        merged_image.paste(tile, (pos_x, pos_y))
                    except Exception as e:
                        print(f"无法加载瓦片 {tile_path}: {str(e)}")
                else:
                    print(f"缺失瓦片: {tile_path}")
        # 删除临时瓦片文件
        for x in range(x_min, x_max + 1):
            for y in range(y_min, y_max + 1):
                tile_path = os.path.join(self.output_dir, f"tile_{zoom}_{x}_{y}.png")
                if os.path.exists(tile_path):
                    os.remove(tile_path)
        # 保存合并后的图像
        merged_image.save(os.path.join(self.output_dir, output_file))
        print(f"合并完成，图像已保存为: {os.path.join(self.output_dir, output_file)}")
        return merged_image

def main():
    # 创建下载器实例
    downloader = TileDownloader(output_dir="map_tiles", max_threads=8)
    
    x_min = 437760  # 最小X坐标
    x_max = 437766  # 最大X坐标
    y_min = 214074   # 最小Y坐标
    y_max = 214079   # 最大Y坐标
    zoom = 19
    # x_min, y_min = downloader.deg2num(39.991206, 116.312515, zoom)
    # x_max, y_max = downloader.deg2num(39.988065, 116.316138, zoom)
    print(f"瓦片范围: x={x_min}-{x_max}, y={y_min}-{y_max}, zoom={zoom}")

    
    # 注意: 请遵守瓦片服务器的使用条款，不要过度请求
    # tile_server = "http://maponline3.bdimg.com/tile/?qt=vtile&x={x}&y={y}&z={z}&styles=pl&scaler=1&udt=20250327&from=jsapi3_0"
    # tile_server = "http://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}"
    tile_server = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
    
    # 下载瓦片
    print("开始下载瓦片...")
    downloader.download_tiles_in_range(
        x_min, x_max, y_min, y_max, zoom, tile_server)
    # print(f"坐标范围: x={pixelToLnglat(0,0,x_min, y_min, zoom)}, y={pixelToLnglat(255,255,x_max, y_max, zoom)}, zoom={zoom}")
    print(f"坐标范围: x={downloader.num2deg(x_min, y_min, zoom)}, y={downloader.num2deg(x_max+1, y_max+1, zoom)}, zoom={zoom}")
    
    # 合并瓦片
    print("开始合并瓦片...")
    merged_image = downloader.merge_tiles(x_min, y_min, x_max, y_max, zoom, "liuyuan_osm_map.png")

    print("合并完成，输出尺寸：", merged_image.size)

if __name__ == "__main__":
    main()