import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createTripLayers, setTripLayerMode } from '../lib/amap-layers.ts';

class Layer {
  constructor(options) { this.options = options; this.visible = options.visible; }
  show() { this.visible = true; }
  hide() { this.visible = false; }
}
const api = { createDefaultLayer: options => new Layer(options), TileLayer: { Satellite: Layer, RoadNet: Layer } };

for (const initial of ['standard', 'satellite']) {
  test(`saved ${initial} preference and repeated switches keep the correct labelled base`, () => {
    const layers = createTripLayers(api, initial);
    const initialLayers = Object.values(layers);
    assert.equal(layers.standard.visible, initial === 'standard');
    assert.equal(layers.satellite.visible, initial === 'satellite');
    assert.equal(layers.roads.visible, initial === 'satellite');
    assert.ok(layers.roads.options.zIndex > layers.satellite.options.zIndex);
    for (const mode of [initial, 'satellite', 'standard', 'satellite', 'standard']) {
      setTripLayerMode(layers, mode);
      assert.equal(layers.standard.visible, mode === 'standard');
      assert.equal(layers.satellite.visible, mode === 'satellite');
      assert.equal(layers.roads.visible, mode === 'satellite');
      assert.deepEqual(Object.values(layers), initialLayers);
    }
  });
}

test('map keeps provider layers attached at initial load and on every layer change', () => {
  const source = readFileSync(new URL('../app/trip-map.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\.setLayers\(/);
  assert.match(source, /layers:Object\.values\(layers\.current\)/);
  assert.match(source, /showLabel:true/);
});
