import test from 'node:test';
import assert from 'node:assert/strict';
import { places, placeById, days, dayPlaceIds, routes } from '../lib/trip-data.ts';
import { drivingRoutes, drivingRouteFor, drivingSegments, drivingSegmentsFor, drivingNavigationUrl, drivingStats } from '../lib/trip-driving.ts';

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

test('seven driving days use continuous official road legs with matching entrance endpoints',()=>{
  assert.deepEqual(drivingRoutes.map(r=>r.day),[6,7,8,9,10,11,12]);
  assert.ok(routes.every(r=>r.mode!=='drive'),'guide lines cannot masquerade as driving routes');
  for(const route of Object.values(drivingSegments)){
    const path=route.coordinates;
    assert.ok(path.length>50);
    assert.ok(path.every(p=>p.length===2&&p.every(Number.isFinite)&&p[0]>99&&p[0]<105&&p[1]>28&&p[1]<33));
    assert.ok(meters(path[0],placeById[route.from].navigationPosition)<500,`${route.from} start`);
    assert.ok(meters(path.at(-1),placeById[route.to].navigationPosition)<500,`${route.to} end`);
    const segments=path.slice(1).map((p,i)=>meters(path[i],p));
    // AMap simplifies one straight G5 highway section to a 2.19 km segment.
    assert.ok(Math.max(...segments)<3000,`${route.from} to ${route.to} must have no disconnected jumps`);
    const length=segments.reduce((a,b)=>a+b,0);
    assert.ok(length>route.distanceMeters*.85&&length<route.distanceMeters*1.15,`${route.from} to ${route.to}: road length agrees with AMap distance`);
    assert.ok(route.durationSeconds>0);
  }
});

test('Yading village connects by shuttle and the same-hotel day drives to the chosen A entrance and back',()=>{
  assert.equal(drivingRouteFor(9).to,'yading-parking');
  assert.equal(drivingRouteFor(10).from,'yading-parking');
  assert.ok(drivingRoutes.every(r=>r.from!=='hotel-zhaxi'&&r.to!=='hotel-zhaxi'));
  assert.equal(days[8].endStay,'hotel-zhaxi');
  assert.equal(days[9].startStay,'hotel-zhaxi');
  assert.equal(days[10].startStay,days[10].endStay);
  assert.deepEqual(drivingRouteFor(11).stops,['hotel-ruifeng','lengga-a','hotel-ruifeng']);
  assert.ok(days[10].stops.includes('lenggacuo'));
  for(const route of drivingRoutes.filter(r=>![9,10].includes(r.day))){
    assert.equal(route.from,days[route.day-1].startStay);
    assert.equal(route.to,days[route.day-1].endStay);
  }
});

test('each navigation link follows one actual leg so multiple stops are not silently dropped',()=>{
  for(const route of Object.values(drivingSegments)){
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

test('driving days include confirmed scenic entrances in order, with no internal shuttle or lake driving',()=>{
  const expected={
    6:['hotel-chengdu-west','siguniang','hotel-danba'],
    7:['hotel-danba','zhonglu','yala','moshi','tagong','hotel-cangrelin'],
    8:['hotel-cangrelin','bends','litang','hotel-tianlai'],
    9:['hotel-tianlai','yading-parking'],
    10:['yading-parking','hotel-ruifeng'],
    11:['hotel-ruifeng','lengga-a','hotel-ruifeng'],
    12:['hotel-ruifeng','s434','hotel-chengdu-wuhou'],
  };
  const used=new Set();
  for(const route of drivingRoutes){
    assert.deepEqual(route.stops,expected[route.day]);
    const legs=drivingSegmentsFor(route);
    assert.equal(legs.length,route.stops.length-1);
    legs.forEach((leg,index)=>{
      assert.equal(leg.from,route.stops[index]);
      assert.equal(leg.to,route.stops[index+1]);
      assert.notEqual(leg.from,leg.to,'a return journey must go through its scenic entrance');
      used.add(route.segmentIds[index]);
    });
    assert.equal(route.distanceMeters,legs.reduce((sum,leg)=>sum+leg.distanceMeters,0));
    assert.equal(route.durationSeconds,legs.reduce((sum,leg)=>sum+leg.durationSeconds,0));
    assert.ok(route.stops.every(id=>dayPlaceIds(days[route.day-1]).includes(id)));
    for(const id of ['jiaju','lengga-b','lenggacuo','luorong','milk','five','hotel-zhaxi'])assert.ok(!route.stops.includes(id));
  }
  assert.deepEqual(used,new Set(Object.keys(drivingSegments)),'unused alternatives must not ship');
  assert.ok(!placeById.jiaju);
  assert.match(placeById['lengga-a'].name,/A线游客中心/);
  assert.match(placeById.siguniang.navigation,/停车场/);
});
