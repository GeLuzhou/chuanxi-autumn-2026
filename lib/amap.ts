import { readDeviceMapConfig } from "./amap-device-config";
import savedCoordinates from "./trip-coordinates.json";
export type Position = [number, number]; // AMap: longitude, latitude (GCJ-02).
export type Overlay = { on: (event: string, callback: () => void) => void };
export type BaseLayer = { show: () => void; hide: () => void };
export type MapInstance = {
  on: (event: string, callback: () => void) => void;
  add: (overlay: Overlay | Overlay[]) => void;
  remove: (overlay: Overlay[]) => void;
  setFitView: (overlays: Overlay[], immediately: boolean, padding: number[], maxZoom: number) => void;
  resize: () => void; zoomIn: () => void; zoomOut: () => void; destroy: () => void;
};
export type AMapAPI = {
  Map: new (container: HTMLElement, options: Record<string, unknown>) => MapInstance;
  Marker: new (options: Record<string, unknown>) => Overlay;
  Polyline: new (options: Record<string, unknown>) => Overlay;
  Pixel: new (x: number, y: number) => unknown;
  createDefaultLayer: (options?: Record<string, unknown>) => BaseLayer;
  TileLayer: { Satellite: new (options?: Record<string, unknown>) => BaseLayer; RoadNet: new (options?: Record<string, unknown>) => BaseLayer };
};
declare global {
  interface Window {
    AMap?: AMapAPI;
    _AMapSecurityConfig?: { securityJsCode: string };
    __chuanxiAMapReady?: () => void;
  }
}
let apiPromise: Promise<AMapAPI> | undefined;
export const coordinateKey = (lat: number, lng: number) => `${lat},${lng}`;

export function loadAMap(): Promise<AMapAPI> {
  const config = readDeviceMapConfig();
  if (!config) return Promise.reject(new Error("请先在这台设备上导入地图配置。"));
  if (window.AMap) return Promise.resolve(window.AMap);
  if (apiPromise) return apiPromise;
  apiPromise = (async () => {
    const publicKey = config.key;
    // User-approved device-only credentials go directly to AMap, never to a foreign proxy.
    window._AMapSecurityConfig = { securityJsCode: config.securityJsCode };
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

export function getTripCoordinates(): Map<string, Position> {
  // These fixed WGS84 itinerary coordinates were converted once by the official
  // AMap JS coordinate service. Viewing the trip needs no online conversion.
  return new Map(Object.entries(savedCoordinates).map(([key, value]) => [key, [value[0], value[1]]]));
}
