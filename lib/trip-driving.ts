import savedRoutes from "./driving-routes.json" with { type: "json" };
import type { Place } from "./trip-data";

export type DrivingRoute = {
  day: number;
  from: string;
  to: string;
  distanceMeters: number;
  durationSeconds: number;
  coordinates: [number, number][];
};
export const drivingRoutes = savedRoutes.routes as DrivingRoute[];
export const drivingPlannedAt = savedRoutes.plannedAt;
export const drivingRouteFor = (day: number) => drivingRoutes.find(route => route.day === day);

export function drivingStats(route: DrivingRoute): string {
  const minutes = Math.round(route.durationSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const distance = route.distanceMeters < 10000 ? (route.distanceMeters / 1000).toFixed(1) : Math.round(route.distanceMeters / 1000);
  return `约 ${distance} 公里 · 驾车约 ${hours ? `${hours}小时` : ""}${minutes % 60 ? `${minutes % 60}分` : ""}`;
}

export function drivingNavigationUrl(route: DrivingRoute, locations: Record<string, Place>): string {
  const endpoint = (id: string) => {
    const place = locations[id];
    const point = place.navigationPosition || place.gcj02;
    if (!point) throw new Error("导航地点缺少高德坐标");
    return [...point, place.name].join(",");
  };
  const params = new URLSearchParams({from: endpoint(route.from), to: endpoint(route.to), mode: "car", policy: "0", src: "chuanxi-autumn", callnative: "1"});
  return `https://uri.amap.com/navigation?${params}`;
}

export function drivingNote(day: number): string {
  if (day === 9) return "自驾到游客中心停车场后换乘景区观光车，晚住亚丁村扎西空墅。景区内接驳不计入驾车里程。";
  if (day === 10) return "先从亚丁村扎西空墅乘景区观光车出沟，再到游客中心停车场取车，开始前往新都桥的自驾。";
  if (day === 11) return "今晚续住瑞枫民宿。冷嘎措往返属于当天游览，不绘入住宿之间的转场主线。";
  return "仅显示住宿之间的驾车主线，不含中途景点绕行。";
}

export const shortPlaceNames: Record<string, string> = {
  "hotel-chongqing": "桔子 · 观音桥",
  "hotel-chengdu-west": "全季 · 宽窄巷子",
  "hotel-chengdu-wuhou": "全季 · 武侯祠",
  "hotel-danba": "格林豪泰 · 丹巴",
  "hotel-cangrelin": "仓热林民宿",
  "hotel-tianlai": "天籁庄园酒店",
  "hotel-zhaxi": "扎西空墅 · 亚丁村",
  "hotel-ruifeng": "瑞枫民宿",
  "yading-parking": "亚丁停车 / 取车点",
};
