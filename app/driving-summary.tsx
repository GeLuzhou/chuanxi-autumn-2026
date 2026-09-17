import { ArrowUpRight, Car, BedDouble } from "lucide-react";
import { placeById, type TripDay } from "@/lib/trip-data";
import { drivingRouteFor, drivingStats, drivingNavigationUrl, drivingNote, drivingPlannedAt, shortPlaceNames } from "@/lib/trip-driving";

export default function DrivingSummary({day, onPlace, compact = false}: {day: TripDay; onPlace: (id: string) => void; compact?: boolean}) {
  if (day.id < 6 || day.id > 12) return null;
  const route = drivingRouteFor(day.id);
  const ids = route ? [route.from, route.to] : [day.startStay!];
  return <div className={`driving-summary ${compact ? "compact" : ""}`} data-driving-day={day.id}>
    <div className="driving-label">{route ? <Car size={14}/> : <BedDouble size={14}/>}<span>{route ? "住宿转场 · 沿道路行驶" : "同一住宿 · 续住"}</span></div>
    <div className="driving-endpoints">{ids.map((id, i) => <span key={id}>
      {i > 0 && <span aria-hidden="true" className="driving-arrow">→</span>}
      <button onClick={() => onPlace(id)} title={placeById[id].name}>{compact ? shortPlaceNames[id] || placeById[id].name : placeById[id].name}</button>
    </span>)}</div>
    {route && <div className="driving-stats"><span>{drivingStats(route)}</span><a href={drivingNavigationUrl(route, placeById)} target="_blank" rel="noreferrer">高德导航<ArrowUpRight size={14}/></a></div>}
    {!compact && <><p className="driving-note">{drivingNote(day.id)}</p>{route && <p className="driving-reference">高德规划于 {drivingPlannedAt}，时间不含游玩、停车及假期拥堵；实际路线以出发时导航为准。</p>}</>}
    {compact && <p className="driving-note">{day.id === 9 ? "停车后乘景区车入村，晚住扎西空墅。" : day.id === 10 ? "从扎西空墅乘景区车出沟，取车后自驾。" : day.id === 11 ? "今晚续住瑞枫；冷嘎措往返不绘入住宿主线。" : "仅住宿转场，不含景点绕行。"}</p>}
  </div>;
}
