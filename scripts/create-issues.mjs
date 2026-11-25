import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const gh=(args)=>execFileSync('gh',args,{encoding:'utf8',stdio:['pipe','pipe','inherit']}).trim();
const repo=JSON.parse(gh(['repo','view','--json','nameWithOwner,isPrivate,url']));
if(repo.nameWithOwner!=='Adamguo88/finance_game')throw new Error('請在 Adamguo88/finance_game 專案目錄執行');
// 使用者已同意 finance_game 為公開倉庫。
const issues=JSON.parse(readFileSync(new URL('../docs/ISSUES.json',import.meta.url),'utf8'));
const existing=JSON.parse(gh(['issue','list','--repo',repo.nameWithOwner,'--state','all','--limit','1000','--json','title,url']));
for(const issue of issues){
 const found=existing.find(x=>x.title===issue.title);
 if(found){console.log('已存在：'+found.url);continue;}
 const url=execFileSync('gh',['issue','create','--repo',repo.nameWithOwner,'--title',issue.title,'--body-file','-'],{input:issue.body,encoding:'utf8',stdio:['pipe','pipe','inherit']}).trim();
 console.log(url);
}
console.log('Repository: '+repo.url);
