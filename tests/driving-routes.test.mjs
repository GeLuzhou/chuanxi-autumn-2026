import test from 'node:test';
import assert from 'node:assert/strict';
import { places, placeById, days, dayPlaceIds, routes } from '../lib/trip-data.ts';
import { drivingRoutes, drivingRouteFor, drivingNavigationUrl, drivingStats } from '../lib/trip-driving.ts';

function meters(a,b){
  const rad=Math.PI/180;
  const h=Math.sin((b[1]-a[1])*rad/2)**2+Math.cos(a[1]*rad)*Math.cos(b[1]*rad)*Math.sin((b[0]-a[0])*rad/2)**2;
  return 6371000*2*Math.asin(Math.sqrt(h));
}

test('booked hotels cover each night and become the next morning start',()=>{
  assert.equal(places.filter(p=>p.category==='住宿'&&p.stayNights).length,8);
  for(const day of days){
    if(day.endStay)assert.ok(placeById[day.endStay].stayNights.includes(day.date));
    if(day.id>1)assert.equal(day.startStay,days[day.id-2].endStay);
    if(day.startStay)assert.ok(dayPlaceIds(day).includes(day.startStay));
    if(day.endStay)assert.ok(dayPlaceIds(day).includes(day.endStay));
  }
});

test('six driving legs use continuous official road geometry with matching endpoints',()=>{
  assert.deepEqual(drivingRoutes.map(r=>r.day),[6,7,8,9,10,12]);
  assert.ok(routes.every(r=>r.mode!=='drive'),'guide lines cannot masquerade as driving routes');
  for(const route of drivingRoutes){
    const path=route.coordinates;
    assert.ok(path.length>50);
    assert.ok(path.every(p=>p.length===2&&p.every(Number.isFinite)&&p[0]>99&&p[0]<105&&p[1]>28&&p[1]<33));
    assert.ok(meters(path[0],placeById[route.from].navigationPosition)<500,`day ${route.day} start`);
    assert.ok(meters(path.at(-1),placeById[route.to].navigationPosition)<500,`day ${route.day} end`);
    const segments=path.slice(1).map((p,i)=>meters(path[i],p));
    // AMap simplifies one straight G5 highway section to a 2.19 km segment.
    assert.ok(Math.max(...segments)<3000,`day ${route.day} must have no disconnected jumps`);
    const length=segments.reduce((a,b)=>a+b,0);
    assert.ok(length>route.distanceMeters*.85&&length<route.distanceMeters*1.15,`day ${route.day} road length agrees with AMap distance`);
    assert.ok(route.durationSeconds>0);
  }
});

test('Yading village connects by shuttle, and a same-hotel day has no invented driving loop',()=>{
  assert.equal(drivingRouteFor(9).to,'yading-parking');
  assert.equal(drivingRouteFor(10).from,'yading-parking');
  assert.ok(drivingRoutes.every(r=>r.from!=='hotel-zhaxi'&&r.to!=='hotel-zhaxi'));
  assert.equal(days[8].endStay,'hotel-zhaxi');
  assert.equal(days[9].startStay,'hotel-zhaxi');
  assert.equal(days[10].startStay,days[10].endStay);
  assert.equal(drivingRouteFor(11),undefined);
  assert.ok(days[10].stops.includes('lenggacuo'));
  for(const route of drivingRoutes.filter(r=>![9,10].includes(r.day))){
    assert.equal(route.from,days[route.day-1].startStay);
    assert.equal(route.to,days[route.day-1].endStay);
  }
});

test('navigation links use explicit GCJ-02 endpoints and no credential or scenic waypoint',()=>{
  for(const route of drivingRoutes){
    const url=new URL(drivingNavigationUrl(route,placeById));
    assert.equal(url.origin,'https://uri.amap.com');
    assert.equal(url.pathname,'/navigation');
    assert.equal(url.searchParams.get('mode'),'car');
    for(const side of ['from','to']){
      const place=placeById[route[side]];
      assert.equal(url.searchParams.get(side),[...place.navigationPosition,place.name].join(','));
    }
    for(const key of ['key','jscode','securityJsCode','via'])assert.equal(url.searchParams.has(key),false);
    assert.match(drivingStats(route),/约 .+ 公里 · 驾车约/);
  }
});
