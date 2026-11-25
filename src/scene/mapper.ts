import type { Snapshot } from '@/domain/model';
export function mapSnapshot(s:Snapshot){return {home:s.ownsHome?'自己的家':'租屋生活',work:s.employed?'工作中':'暫時休息',warning:s.gap,hasMortgage:s.ownsHome&&s.debt>0};}
