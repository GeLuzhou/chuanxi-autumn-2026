import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseDeviceMapConfig, saveDeviceMapConfig, readDeviceMapConfig, clearDeviceMapConfig, DEVICE_CONFIG_STORAGE } from '../lib/amap-device-config.ts';
import { places, routes } from '../lib/trip-data.ts';

const sample = {format:'chuanxi-amap-device-v1', key:'1'.repeat(32), securityJsCode:'2'.repeat(32)};
test('private configuration validates credentials and cannot inject remote hosts', () => {
  assert.deepEqual(parseDeviceMapConfig('\uFEFF'+JSON.stringify({...sample, serviceHost:'https://untrusted.example', scriptUrl:'https://untrusted.example/x.js'})), sample);
  for (const value of [null,[],{}, {...sample,key:'not a key'}, {...sample,securityJsCode:123}, {...sample,format:'unknown'}]) {
    assert.throws(()=>parseDeviceMapConfig(JSON.stringify(value)), /有效的地图配置/);
  }
  assert.throws(()=>parseDeviceMapConfig('{broken'), /有效的地图配置/);
  assert.throws(()=>parseDeviceMapConfig(' '.repeat(9000)), /有效的地图配置/);
});

test('import, reload and clear retain only map credentials, without any upload', () => {
  const previous=globalThis.window;
  const values=new Map([['chuanxi-map-layer','satellite']]);
  globalThis.window={localStorage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}};
  try {
    assert.equal(readDeviceMapConfig(),null);
    saveDeviceMapConfig(JSON.stringify(sample));
    assert.deepEqual(readDeviceMapConfig(),sample);
    assert.throws(()=>saveDeviceMapConfig('invalid'));
    assert.deepEqual(readDeviceMapConfig(),sample, 'bad imports must preserve existing working credentials');
    clearDeviceMapConfig();
    assert.equal(readDeviceMapConfig(),null);
    assert.equal(values.has(DEVICE_CONFIG_STORAGE),false);
    assert.equal(values.get('chuanxi-map-layer'),'satellite');
  } finally {globalThis.window=previous;}
});

test('unavailable browser storage is reported without echoing credentials', () => {
  const previous=globalThis.window;
  globalThis.window={get localStorage(){throw new Error('Storage unavailable');}};
  try {
    assert.equal(readDeviceMapConfig(),null);
    assert.throws(()=>saveDeviceMapConfig(JSON.stringify(sample)), /浏览器无法保存配置/);
    assert.throws(()=>clearDeviceMapConfig(), /暂时无法清除配置/);
  } finally {globalThis.window=previous;}
});

test('every spot, route vertex and overview corner has a local official coordinate', () => {
  const converted=JSON.parse(readFileSync(new URL('../lib/trip-coordinates.json',import.meta.url)));
  const points=[...places.map(p=>[p.lat,p.lng]),...routes.flatMap(r=>r.coords),[28.28,99.99],[31.25,104.19]];
  const expected=new Set(points.map(([lat,lng])=>`${lat},${lng}`));
  assert.deepEqual(new Set(Object.keys(converted)),expected);
  for(const [lat,lng] of points){
    const coordinate=converted[`${lat},${lng}`];
    assert.equal(coordinate.length,2);
    assert.ok(coordinate.every(Number.isFinite));
    assert.ok(Math.abs(coordinate[0]-lng)<0.02 && Math.abs(coordinate[1]-lat)<0.02);
  }
});

test('map bootstrap has no foreign proxy, runtime coordinate conversion or remote config request', () => {
  const source=readFileSync(new URL('../lib/amap.ts',import.meta.url),'utf8');
  assert.doesNotMatch(source,/chatgpt\.site|serviceHost|convertFrom|fetch\(/);
  assert.match(source,/https:\/\/webapi\.amap\.com\/maps/);
});
