import { places, routes } from "./trip-data";
export type Position = [number, number]; // AMap: longitude, latitude (GCJ-02).
export type Overlay = { on: (event: string, callback: () => void) => void };
export type MapInstance = {
  on: (event: string, callback: () => void) => void;
  add: (overlay: Overlay | Overlay[]) => void;
  remove: (overlay: Overlay[]) => void;
  setLayers: (layers: unknown[]) => void;
  setFitView: (overlays: Overlay[], immediately: boolean, padding: number[], maxZoom: number) => void;
  resize: () => void; zoomIn: () => void; zoomOut: () => void; destroy: () => void;
};
export type AMapAPI = {
  Map: new (container: HTMLElement, options: Record<string, unknown>) => MapInstance;
  Marker: new (options: Record<string, unknown>) => Overlay;
  Polyline: new (options: Record<string, unknown>) => Overlay;
  Pixel: new (x: number, y: number) => unknown;
  createDefaultLayer: () => unknown;
  TileLayer: { Satellite: new () => unknown; RoadNet: new () => unknown };
  convertFrom: (coords: Position[], type: "gps", callback: (status: string, result: {
    locations?: { getLng: () => number; getLat: () => number }[];
  }) => void) => void;
};
declare global {
  interface Window {
    AMap?: AMapAPI;
    _AMapSecurityConfig?: { serviceHost: string };
    __chuanxiAMapReady?: () => void;
  }
}
const service = "https://chuanxi-amap-service.right-quail-0009.chatgpt.site";
let apiPromise: Promise<AMapAPI> | undefined;
let coordinatesPromise: Promise<Map<string, Position>> | undefined;
export const coordinateKey = (lat: number, lng: number) => `${lat},${lng}`;

export function loadAMap(): Promise<AMapAPI> {
  if (window.AMap) return Promise.resolve(window.AMap);
  if (apiPromise) return apiPromise;
  apiPromise = (async () => {
    const response = await fetch(`${service}/config`, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("地图配置暂时无法加载，请稍后重试。");
    const config = await response.json() as { key?: string; serviceHost?: string };
    if (!config.key || config.serviceHost !== `${service}/_AMapService`) throw new Error("地图配置暂时不可用。");
    const publicKey = config.key;
    // Set before loading AMap; the security code only exists in the proxy's runtime secrets.
    window._AMapSecurityConfig = { serviceHost: config.serviceHost };
    return new Promise<AMapAPI>((resolve, reject) => {
      const script = document.createElement("script");
      const timer = window.setTimeout(() => fail(), 30000);
      function fail() {
        window.clearTimeout(timer); delete window.__chuanxiAMapReady; script.remove();
        reject(new Error("高德地图暂未加载，请检查网络后重试。"));
      }
      window.__chuanxiAMapReady = () => {
        window.clearTimeout(timer); delete window.__chuanxiAMapReady;
        if (window.AMap) resolve(window.AMap); else fail();
      };
      script.async = true;
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(publicKey)}&callback=__chuanxiAMapReady`;
      script.onerror = fail; document.head.appendChild(script);
    });
  })().catch(error => { apiPromise = undefined; throw error; });
  return apiPromise;
}

export function convertTripCoordinates(A: AMapAPI) {
  if (coordinatesPromise) return coordinatesPromise;
  coordinatesPromise = (async () => {
    // Original Leaflet data is WGS84; convert points and paths consistently.
    const input = new Map<string, Position>();
    places.forEach(p => input.set(coordinateKey(p.lat, p.lng), [p.lng, p.lat]));
    routes.forEach(r => r.coords.forEach(([lat,lng]) => input.set(coordinateKey(lat,lng), [lng,lat])));
    [[28.28,99.99],[31.25,104.19]].forEach(([lat,lng]) => input.set(coordinateKey(lat,lng), [lng,lat]));
    const entries = [...input]; const output = new Map<string, Position>();
    for (let offset = 0; offset < entries.length; offset += 40) {
      const batch = entries.slice(offset, offset + 40);
      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error("景点坐标转换超时，请重试。")), 20000);
        A.convertFrom(batch.map(([,coord]) => coord), "gps", (status,result) => {
          window.clearTimeout(timeout);
          if (status !== "complete" || result.locations?.length !== batch.length) {
            reject(new Error("景点坐标暂未加载，请重试。")); return;
          }
          result.locations.forEach((coord,i) => output.set(batch[i][0], [coord.getLng(),coord.getLat()])); resolve();
        });
      });
    }
    return output;
  })().catch(error => { coordinatesPromise = undefined; throw error; });
  return coordinatesPromise;
}
