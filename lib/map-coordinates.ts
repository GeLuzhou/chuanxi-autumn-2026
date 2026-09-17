import type { Place } from "./trip-data";

export const coordinateKey = (lat: number, lng: number) => `${lat},${lng}`;

export function buildCoordinateIndex(saved: Record<string, number[]>, places: Place[]): Map<string, [number, number]> {
  const coordinates = new Map<string, [number, number]>(Object.entries(saved).map(([key, point]) => [key, [point[0], point[1]]]));
  // AMap POIs already use GCJ-02; converting these again shifts hotel pins off their roads.
  for (const place of places) {
    if (place.gcj02) coordinates.set(coordinateKey(place.lat, place.lng), place.gcj02);
  }
  return coordinates;
}
