"use client";
import {useEffect,useRef,useState} from "react";
import {Maximize,LocateFixed,MapPinned,Map as MapIcon,Satellite,Plus,Minus,LoaderCircle,Settings2,FileKey2} from "lucide-react";
import {ToggleGroup,ToggleGroupItem} from "@/components/ui/toggle-group";
import {days,places,placeById,overviewIds,routes,dayPlaceIds} from "@/lib/trip-data";
import {drivingRoutes,drivingRouteFor,drivingSegmentsFor,shortPlaceNames} from "@/lib/trip-driving";
import {loadAMap,getTripCoordinates,coordinateKey,type AMapAPI,type MapInstance,type Overlay,type Position} from "@/lib/amap";
import {readDeviceMapConfig} from "@/lib/amap-device-config";
import {createTripLayers,setTripLayerMode,type LayerMode,type TripLayers} from "@/lib/amap-layers";
import MapDeviceSettings from "./map-device-settings";
type Props={dayId:number;onPlace:(id:string)=>void;counts:Record<string,number>;onOverview:()=>void};
const mapPlaceIds=(dayId:number,scope:"west"|"all")=>{
  const day=days.find(d=>d.id===dayId);
  if(day)return dayPlaceIds(day);
  const westIds=new Set(days.filter(d=>d.id>=6&&d.id<=12).flatMap(dayPlaceIds));
  return Array.from(new Set([...overviewIds,...drivingRoutes.flatMap(r=>r.stops),...places.filter(p=>p.category==="住宿").map(p=>p.id),"yading-parking"]))
    .filter(id=>scope==="all"||westIds.has(id));
};

export default function TripMap({dayId,onPlace,counts,onOverview}:Props){
  const el=useRef<HTMLDivElement>(null);
  const map=useRef<MapInstance|null>(null);
  const lib=useRef<AMapAPI|null>(null);
  const coordinates=useRef(new Map<string,Position>());
  const overlays=useRef<Overlay[]>([]);
  const layers=useRef<TripLayers|null>(null);
  const pick=useRef(onPlace);pick.current=onPlace;
  const [ready,setReady]=useState(false);
  const [loaded,setLoaded]=useState(false);
  const [error,setError]=useState("");
  const [configured]=useState(()=>Boolean(readDeviceMapConfig()));
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [scope,setScope]=useState<"west"|"all">("west");
  const [viewRevision,setViewRevision]=useState(0);
  const [layerMode,setLayerMode]=useState<LayerMode>(()=>{
    try{return localStorage.getItem("chuanxi-map-layer")==="satellite"?"satellite":"standard";}catch{return "standard";}
  });
  const initialLayerMode=useRef(layerMode);
  useEffect(()=>{
    if(!configured)return;
    let disposed=false;let resize:ResizeObserver|undefined;let timeout:number|undefined;
    loadAMap().then(A=>{
      const converted=getTripCoordinates();
      if(disposed||!el.current)return;
      lib.current=A;coordinates.current=converted;
      layers.current=createTripLayers(A,initialLayerMode.current);
      const m=new A.Map(el.current,{viewMode:"2D",center:[101.5,30.3],zoom:7,zooms:[4,18],resizeEnable:true,animateEnable:true,showLabel:true,features:["bg","point","road","building"],layers:Object.values(layers.current)});
      map.current=m;
      timeout=window.setTimeout(()=>{if(!disposed)setError("高德底图加载较慢，可稍后重试；行程与景点仍可浏览。");},30000);
      m.on("complete",()=>{if(!disposed){window.clearTimeout(timeout);setLoaded(true);setError("");}});
      resize=new ResizeObserver(()=>m.resize());resize.observe(el.current);setReady(true);
    }).catch(reason=>{if(!disposed)setError(reason instanceof Error?reason.message:"高德地图暂未加载，请重试。");});
    return()=>{disposed=true;window.clearTimeout(timeout);resize?.disconnect();map.current?.destroy();map.current=null;overlays.current=[];};
  },[configured]);
  useEffect(()=>{
    if(!ready||!map.current||!layers.current)return;
    setTripLayerMode(layers.current,layerMode);
    try{localStorage.setItem("chuanxi-map-layer",layerMode);}catch{/* Preference storage is optional. */}
  },[ready,layerMode]);
  useEffect(()=>{
    const A=lib.current,m=map.current;if(!ready||!A||!m)return;
    m.remove(overlays.current);const next:Overlay[]=[];
    const d=days.find(x=>x.id===dayId);
    const ids=mapPlaceIds(dayId,scope);
    const pts=ids.map(id=>placeById[id]);
    const position=(lat:number,lng:number)=>coordinates.current.get(coordinateKey(lat,lng))!;
    const shown=dayId?routes.filter(r=>r.day===dayId):routes.filter(r=>scope==="all"||r.day>=6);
    shown.forEach(r=>{
      const color=r.mode==="rail"?"#c5762c":r.mode==="flight"?"#72819b":r.mode==="walk"?"#14886c":"#2c60d9";
      const line=new A.Polyline({path:r.coords.map(([lat,lng])=>position(lat,lng)),strokeColor:color,strokeWeight:4,strokeOpacity:.95,strokeStyle:"dashed",strokeDasharray:r.mode==="walk"?[3,6]:[8,8],isOutline:true,borderWeight:2,outlineColor:"#ffffff",lineJoin:"round",cursor:"pointer",zIndex:40});
      line.on("click",()=>{const first=days[r.day-1].stops.find(id=>placeById[id].category!=="交通");if(first)pick.current(first);});next.push(line);
    });
    const roads=dayId?drivingRoutes.filter(r=>r.day===dayId):drivingRoutes;
    roads.flatMap(drivingSegmentsFor).forEach(r=>{
      // Official road geometry is already GCJ-02. Never substitute a direct line.
      const line=new A.Polyline({path:r.coordinates,strokeColor:"#2c60d9",strokeWeight:5,strokeOpacity:.9,isOutline:true,borderWeight:2,outlineColor:"#ffffff",lineJoin:"round",showDir:true,cursor:"pointer",zIndex:45});
      line.on("click",()=>pick.current(r.to));next.push(line);
    });
    const activeRoad=drivingRouteFor(dayId);
    pts.forEach((p,i)=>{
      const button=document.createElement("button");button.type="button";
      const endpoint=activeRoad?.from===p.id&&activeRoad?.to===p.id?"roundtrip":activeRoad?.from===p.id?"start":activeRoad?.to===p.id?"finish":"";
      const waypoint=activeRoad?.stops.slice(1,-1).includes(p.id);
      button.className=`pin-body ${p.category==="交通"?"transit":""} ${p.category==="住宿"?"hotel":""} ${endpoint} ${waypoint?"waypoint":""} ${d?.optional?.includes(p.id)?"optional":""}`;
      button.setAttribute("aria-label",`查看${p.name}，${counts[p.id]||0}张旅行照片`);button.dataset.placeId=p.id;
      const dot=document.createElement("span");dot.className="pin-dot";dot.textContent=endpoint==="roundtrip"?"宿":endpoint==="start"?"起":endpoint==="finish"?"终":waypoint?"经":p.category==="住宿"?"宿":dayId?String(i+1):"";button.appendChild(dot);
      const label=document.createElement("span");label.className="pin-name";label.textContent=shortPlaceNames[p.id]||p.name.replace(" · 双桥沟","").replace(" · 远眺","");button.appendChild(label);
      if(counts[p.id]){const count=document.createElement("span");count.className="pin-count";count.textContent=String(counts[p.id]);button.appendChild(count);}
      button.addEventListener("click",event=>{event.stopPropagation();pick.current(p.id);});
      next.push(new A.Marker({position:position(p.lat,p.lng),content:button,offset:new A.Pixel(-12,-12),anchor:"top-left",title:p.name,zIndex:endpoint?150:waypoint?140:p.category==="住宿"?130:p.category==="交通"?100:110}));
    });
    m.add(next);overlays.current=next;return()=>{m.remove(next);};
  },[ready,dayId,scope,counts]);
  useEffect(()=>{
    const A=lib.current,m=map.current;if(!ready||!A||!m)return;
    const ids=[...mapPlaceIds(dayId,scope),...(!dayId&&scope==="all"?["nanjing"]:[])];
    const points:Position[]=ids.map(id=>placeById[id]).map(p=>coordinates.current.get(coordinateKey(p.lat,p.lng))!);
    const roads=dayId?drivingRoutes.filter(r=>r.day===dayId):drivingRoutes;
    // Fit only the bounding corners, avoiding thousands of temporary markers.
    const bounds=roads.flatMap(drivingSegmentsFor).flatMap(r=>r.coordinates).concat(points);
    const min:Position=[Infinity,Infinity],max:Position=[-Infinity,-Infinity];
    bounds.forEach(([lng,lat])=>{min[0]=Math.min(min[0],lng);min[1]=Math.min(min[1],lat);max[0]=Math.max(max[0],lng);max[1]=Math.max(max[1],lat);});
    const fitting=[min,max].map(position=>new A.Marker({position}));
    const narrow=(el.current?.clientWidth||0)<600;
    const bottom=el.current?.parentElement?.querySelector(".map-bottom")?.getBoundingClientRect().height||110;
    const top=narrow?200:250;
    const bottomPadding=Math.min(bottom+45,(el.current?.clientHeight||600)*.4);
    m.setFitView(fitting,false,narrow?[top,bottomPadding,35,110]:[top,bottomPadding,65,270],dayId?(points.length<=2?16:13):8);
  },[ready,dayId,scope,viewRevision]);
  return <>
    <div ref={el} className="map-canvas" data-map-provider="amap" data-map-layer={layerMode} data-map-ready={loaded} aria-label="高德旅行地图，点选地点查看介绍与照片"/>
    <div className="map-heading"><span className="eyebrow">{dayId?`DAY ${String(dayId).padStart(2,"0")} / ${days.length}`:scope==="west"?"WESTERN SICHUAN":"OUR AUTUMN JOURNEY"}</span><h2>{dayId?days[dayId-1].title:scope==="west"?"川西，一路向山":`从南京出发的${days.length}天`}</h2><p>{dayId?days[dayId-1].subtitle:"点开地图上的地点，看风景、行程与相册。"}</p></div>
    <div className="map-view-actions"><button onClick={()=>{setScope("west");setViewRevision(n=>n+1);onOverview()}}><LocateFixed size={16}/>川西环线</button><button onClick={()=>{setScope("all");setViewRevision(n=>n+1);onOverview()}}><Maximize size={16}/>完整旅程</button></div>
    <ToggleGroup type="single" value={layerMode} onValueChange={value=>{if(value)setLayerMode(value as LayerMode);}} className="map-layer-switch" aria-label="地图图层">
      <ToggleGroupItem value="standard" aria-label="标准地图"><MapIcon size={16}/>标准地图</ToggleGroupItem>
      <ToggleGroupItem value="satellite" aria-label="卫星地图"><Satellite size={16}/>卫星地图</ToggleGroupItem>
    </ToggleGroup>
    <div className="map-zoom"><button aria-label="放大地图" disabled={!ready} onClick={()=>map.current?.zoomIn()}><Plus size={20}/></button><button aria-label="缩小地图" disabled={!ready} onClick={()=>map.current?.zoomOut()}><Minus size={20}/></button></div>
    <button className="map-config-action" aria-label="地图配置" title="地图配置" onClick={()=>setSettingsOpen(true)}><Settings2 size={18}/></button>
    {!configured&&<div className="map-setup-prompt"><FileKey2 size={20}/><div><strong>在这台设备启用地图</strong><p>导入私密配置，直接连接高德。</p><button className="primary-button" onClick={()=>setSettingsOpen(true)}>导入地图配置</button></div></div>}
    {configured&&!loaded&&!error&&<div className="map-loading" role="status"><LoaderCircle size={16} className="animate-spin"/>正在直连高德地图…</div>}
    {error&&<div className="map-error" role="status"><MapPinned size={18}/><span>{error}</span><button onClick={()=>window.location.reload()}>重新加载</button></div>}
    <MapDeviceSettings open={settingsOpen} onOpenChange={setSettingsOpen} configured={configured}/>
    <div className="route-key"><span><i/>酒店与景点间自驾</span><span><i className="hotel"/>酒店</span><span className="key-note">自驾到入口 · 景区交通另计</span></div>
  </>;
}
