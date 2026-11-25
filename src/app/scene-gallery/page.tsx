import {AvatarModel,BenchModel,FinanceModel,HomeModel,OfficeModel,TreeModel,worldPalette} from '@/scene/models';
export default function Gallery(){const assets=[
 {name:'角色 · 工作中',model:<AvatarModel/>,view:'-90 -145 180 180'},
 {name:'角色 · 職涯暫停',model:<><g transform="translate(0 -13)"><BenchModel/></g><g transform="translate(0 -13)"><AvatarModel resting/></g></>,view:'-90 -145 180 180'},
 {name:'住宅 · 租屋',model:<HomeModel/>,view:'-145 -205 290 280'},
 {name:'住宅 · 自有住宅與房貸',model:<HomeModel owned mortgage/>,view:'-145 -205 290 280'},
 {name:'職場 · 工作中',model:<OfficeModel/>,view:'-140 -205 280 280'},
 {name:'職場 · 暫停',model:<OfficeModel employed={false}/>,view:'-140 -205 280 280'},
 {name:'財務小屋 · 平穩',model:<FinanceModel/>,view:'-120 -145 240 210'},
 {name:'財務小屋 · 現金缺口',model:<FinanceModel attention/>,view:'-120 -145 240 210'},
 {name:'公園 · 休憩',model:<><TreeModel x={40} y={0} scale={1}/><g transform="translate(-28 15)"><BenchModel/></g></>,view:'-120 -145 240 210'}
];return <main><header><div className="brand">LIFE STUDIO<span>THE LIVING WORLD · ASSET ATLAS</span></div></header><p className="eyebrow">2D VECTORS / ISOMETRIC WORLD</p><h1>一個持續存在的人生世界。</h1><p className="muted">角色、居所、職場與生活的留白。相同的世界，隨著你的選擇改變狀態。</p><section className="modelGallery" aria-label="模型狀態圖鑑">{assets.map(asset=><article key={asset.name}><svg viewBox={asset.view} role="img" aria-label={asset.name}>{asset.model}</svg><h2>{asset.name}</h2><p>原創可修改向量 · 無外部圖片或 3D 依賴</p></article>)}</section><footer><p>模型色彩</p><div style={{display:'flex',gap:12,flexWrap:'wrap'}}>{Object.entries(worldPalette).map(([key,value])=><div key={key} style={{fontSize:10}}><span style={{display:'block',width:42,height:26,background:value,borderRadius:5}}/>{key}</div>)}</div></footer></main>;}
