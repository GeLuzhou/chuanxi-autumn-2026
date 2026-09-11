import { Camera, ExternalLink, LockKeyhole } from "lucide-react";

export type Photo = {
  id: string; placeId: string; filename: string; mime: string;
  size: number; caption: string; createdAt: string; url: string;
};

export const PRIVATE_ALBUM_URL = "https://chuanxi-autumn-2026-coast.right-quail-0009.chatgpt.site/";

type Props = {
  placeId: string; placeName: string; photos: Photo[]; signedIn: boolean;
  onChange: () => void; error?: string; loading?: boolean;
};

export default function PhotoAlbum({ placeName }: Props) {
  return <div className="photo-album">
    <div className="album-heading"><div>
      <h3>{placeName} · 旅行相册</h3>
      <p>给抵达的那一天，留一个位置。</p>
    </div><Camera size={24}/></div>
    <div className="photo-empty">
      <LockKeyhole size={32}/>
      <b>旅行照片保存在私人相册</b>
      <p>打开原来的旅行手册，用站点所有者的账号登录，再选择「{placeName}」上传或查看照片。</p>
      <a className="primary-button" href={PRIVATE_ALBUM_URL} target="_blank" rel="noreferrer">
        打开私人相册 <ExternalLink size={16}/>
      </a>
    </div>
    <p className="upload-note">这里公开展示行程和风景参考照。私人相册中的照片不会自动公开到这个网站。</p>
  </div>;
}
