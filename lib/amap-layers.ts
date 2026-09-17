import type { AMapAPI, BaseLayer } from "./amap";

export type LayerMode = "standard" | "satellite";
export type TripLayers = { standard: BaseLayer; satellite: BaseLayer; roads: BaseLayer };

export function createTripLayers(api: AMapAPI, mode: LayerMode): TripLayers {
  const satellite = mode === "satellite";
  return {
    standard: api.createDefaultLayer({ visible: !satellite, zIndex: 0 }),
    satellite: new api.TileLayer.Satellite({ visible: satellite, zIndex: 1 }),
    roads: new api.TileLayer.RoadNet({ visible: satellite, zIndex: 2 }),
  };
}

export function setTripLayerMode(layers: TripLayers, mode: LayerMode): void {
  // Keep all layers attached: setLayers() also removes AMap's internal place-name
  // layer. Show the next labelled base before hiding the previous one.
  if (mode === "satellite") {
    layers.satellite.show();
    layers.roads.show();
    layers.standard.hide();
  } else {
    layers.standard.show();
    layers.roads.hide();
    layers.satellite.hide();
  }
}
