'''
代码来自知乎专栏：https://zhuanlan.zhihu.com/p/363654824
'''
import math
# 像素分辨率
def getResolution(level):
    return 156543.03*math.pow(2,-level)
# 经纬度转瓦片
def lnglatToTile(lng,lat,level):
    tileX=int((lng+180)/360*math.pow(2,level))
    tileY=int((1-math.asinh(math.tan(math.radians(lat)))/math.pi)*math.pow(2,level-1))
    return tileX,tileY
# 瓦片转经纬度
def tileToLnglat(tileX,tileY,level):
    lng=tileX/math.pow(2,level)*360-180
    lat=math.degrees(math.atan(math.sinh(math.pi*(1-2*tileY/math.pow(2,level)))))
    return lng,lat
# 经纬度转像素
def lnglatToPixel(lng,lat,level):
    pixelX=round((lng+180)/360*math.pow(2,level)*256%256)
    pixelY=round((1-math.log(math.tan(math.radians(lat))+1/math.cos(math.radians(lat)))/(2*math.pi))*math.pow(2,level)*256%256)
    return pixelX,pixelY
# 瓦片和像素转经纬度
def pixelToLnglat(tileX,tileY,pixelX,pixelY,level):
    lng=(tileX+pixelX/256)/math.pow(2,level)*360-180
    lat=math.degrees(math.atan(math.sinh(math.pi-2*math.pi*(tileY+pixelY/256)/math.pow(2,level))))
    return lng,lat

if __name__ == '__main__':
    # 北京坐标[116.391305,39.905530]
    print(lnglatToTile(120.592570,31.315551 ,19))