import { ArrowUpRight, Car, BedDouble } from "lucide-react";
import { placeById, type TripDay } from "@/lib/trip-data";
import { drivingRouteFor, drivingSegmentsFor, drivingStats, drivingNavigationUrl, drivingNote, drivingPlannedAt, shortPlaceNames } from "@/lib/trip-driving";

export default function DrivingSummary({day, onPlace, compact = false}: {day: TripDay; onPlace: (id: string) => void; compact?: boolean}) {
  if (day.id < 6 || day.id > 12) return null;
  const route = drivingRouteFor(day.id);
  const ids = route ? route.stops : [day.startStay!];
  const segments = route ? drivingSegmentsFor(route) : [];
  return <div className={`driving-summary ${compact ? "compact" : ""}`} data-driving-day={day.id}>
    <div className="driving-label">{route ? <Car size={14}/> : <BedDouble size={14}/>}<span>{route ? "每日自驾 · 景点入口与酒店" : "同一住宿 · 续住"}</span></div>
    <div className="driving-endpoints">{ids.map((id, i) => <span key={`${id}-${i}`}>
      {i > 0 && <span aria-hidden="true" className="driving-arrow">→</span>}
      <button onClick={() => onPlace(id)} title={placeById[id].name}>{compact ? shortPlaceNames[id] || placeById[id].name : placeById[id].name}</button>
    </span>)}</div>
    {route && <div className="driving-stats"><span>{drivingStats(route)}</span>{segments.length===1 ? <a href={drivingNavigationUrl(segments[0], placeById)} target="_blank" rel="noreferrer">高德导航<ArrowUpRight size={14}/></a> : <details className="driving-navigation" key={route.id}>
      <summary>分段导航 <ArrowUpRight size={14}/></summary>
      <nav className="driving-navigation-list" aria-label={`${day.date}各路段高德导航`}>
        <p>按游览顺序，选择下一段</p>
        {segments.map((segment,index)=><a key={`${segment.from}-${segment.to}`} href={drivingNavigationUrl(segment,placeById)} target="_blank" rel="noreferrer"><span>{index+1}. {shortPlaceNames[segment.from]||placeById[segment.from].name} → {shortPlaceNames[segment.to]||placeById[segment.to].name}<small>{drivingStats(segment)}</small></span><ArrowUpRight size={14}/></a>)}
      </nav>
    </details>}</div>}
    {!compact && <><p className="driving-note">{drivingNote(day.id)}</p>{route && <p className="driving-reference">高德规划于 {drivingPlannedAt}，时间不含游玩、停车及假期拥堵；实际路线以出发时导航为准。</p>}</>}
    {compact && <p className="driving-note">{day.id === 9 ? "停车后乘景区车入村，晚住扎西空墅。" : day.id === 10 ? "从扎西空墅乘景区车出沟，取车后自驾。" : day.id === 11 ? "A线入口往返；上山段不计入自驾。" : "自驾到景点入口；景区交通另计。"}</p>}
  </div>;
}
