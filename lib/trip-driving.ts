import savedRoutes from "./driving-routes.json" with { type: "json" };
import type { Place } from "./trip-data";

export type DrivingSegment = {
  from: string;
  to: string;
  distanceMeters: number;
  durationSeconds: number;
  coordinates: [number, number][];
};
export type DrivingRoute = Omit<DrivingSegment, "coordinates"> & {
  id: string;
  day: number;
  label: string;
  stops: string[];
  segmentIds: string[];
};
export const drivingRoutes = savedRoutes.routes as DrivingRoute[];
export const drivingSegments: Record<string, DrivingSegment> = Object.fromEntries(
  Object.entries(savedRoutes.segments).map(([id, segment]) => [id, {
    ...segment, coordinates: segment.coordinates.map(([lng, lat]): [number, number] => [lng, lat]),
  }]),
);
export const drivingSegmentsFor = (route: DrivingRoute) => route.segmentIds.map(id => drivingSegments[id]);
export const drivingPlannedAt = savedRoutes.plannedAt;
export const drivingRouteFor = (day: number) => drivingRoutes.find(route => route.day === day);

export function drivingStats(route: Pick<DrivingSegment, "distanceMeters" | "durationSeconds">): string {
  const minutes = Math.round(route.durationSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const distance = route.distanceMeters < 10000 ? (route.distanceMeters / 1000).toFixed(1) : Math.round(route.distanceMeters / 1000);
  return `约 ${distance} 公里 · 驾车约 ${hours ? `${hours}小时` : ""}${minutes % 60 ? `${minutes % 60}分` : ""}`;
}

export function drivingNavigationUrl(route: DrivingSegment, locations: Record<string, Place>): string {
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
  if (day === 11) return "瑞枫民宿往返冷嘎措A线游客中心（帮木吉德方向），上山和湖边步行不计入自驾线路与时间。";
  if (day === 12) return "按原定S434方向经红海子路段回成都；若当天路况不适合，出发时改走高德推荐的返程路线。";
  return "酒店出发，途经当天景点的停车／换乘入口，再到当晚酒店；景区观光车和徒步段不计入驾车路线。";
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
  "siguniang": "双桥沟停车场",
  "zhonglu": "中路藏寨",
  "yala": "雅拉观景台",
  "moshi": "墨石公园入口",
  "tagong": "塔公草原入口",
  "bends": "天路十八弯",
  "litang": "理塘停车点",
  "s434": "S434·红海子",
  "lengga-a": "冷嘎措A线入口",
};
