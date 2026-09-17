"use client";
import {useRef,useState} from "react";
import {FileKey2,Upload,Trash2} from "lucide-react";
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from "@/components/ui/dialog";
import {MAX_CONFIG_BYTES,saveDeviceMapConfig,clearDeviceMapConfig} from "@/lib/amap-device-config";

type Props={open:boolean;onOpenChange:(open:boolean)=>void;configured:boolean};
export default function MapDeviceSettings({open,onOpenChange,configured}:Props){
  const input=useRef<HTMLInputElement>(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  async function importFile(file:File|undefined){
    if(!file)return;
    setBusy(true);setError("");
    try{
      if(file.size>MAX_CONFIG_BYTES)throw new Error("配置文件过大，请选择「川西地图本机配置.json」。");
      saveDeviceMapConfig(await file.text());
      window.location.reload();
    }catch(reason){
      setError(reason instanceof Error?reason.message:"导入失败，请重新选择配置文件。");
      setBusy(false);if(input.current)input.current.value="";
    }
  }
  function clear(){
    try{clearDeviceMapConfig();window.location.reload();}
    catch(reason){setError(reason instanceof Error?reason.message:"暂时无法清除配置。");}
  }
  return <Dialog open={open} onOpenChange={value=>{setError("");onOpenChange(value)}}>
    <DialogContent className="map-settings-dialog">
      <DialogHeader>
        <span className="map-settings-icon"><FileKey2 size={25}/></span>
        <DialogTitle>这台设备的地图配置</DialogTitle>
        <DialogDescription>导入一次，之后直接连接高德。每台手机、每个浏览器需分别设置。</DialogDescription>
      </DialogHeader>
      <div className="map-device-state">{configured?"已导入 · 高德直连":"尚未导入"}</div>
      <p className="map-settings-copy">选择私下收到的「川西地图本机配置.json」。文件只在当前浏览器读取，不会上传到 GitHub 或我们的服务器。</p>
      <input ref={input} type="file" accept=".json,application/json" className="sr-only" tabIndex={-1} aria-label="选择地图配置文件" onChange={event=>void importFile(event.target.files?.[0])}/>
      <button className="primary-button" disabled={busy} onClick={()=>input.current?.click()}><Upload size={17}/>{busy?"正在导入…":configured?"更换配置文件":"选择配置文件"}</button>
      {error&&<p className="map-settings-error" role="alert">{error}</p>}
      <p className="map-settings-privacy">配置含高德安全密钥，会保存在本浏览器，并在加载地图时发送给高德；设备使用者可以读取。请勿公开分享文件。清理网站数据后需重新导入。</p>
      {configured&&<button className="map-config-clear" onClick={clear}><Trash2 size={15}/>清除本机配置</button>}
    </DialogContent>
  </Dialog>;
}
