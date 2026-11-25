import type { Metadata } from 'next';
import '@fontsource/noto-sans-tc/400.css';
import './globals.css';
export const metadata:Metadata={title:'Life Studio｜人生，沒有唯一的劇本',description:'透過選擇，體驗不同的財務人生'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-Hant"><body>{children}</body></html>;}
