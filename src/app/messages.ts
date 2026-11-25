import { ZodError } from 'zod';

/** Keep schema internals out of product errors while preserving actionable domain messages. */
export function userMessage(error:unknown,fallback='操作失敗'):string {
 if(error instanceof ZodError)return '資料格式、參數範圍或版本不支援，請檢查輸入或備份內容。';
 if(error instanceof SyntaxError)return '檔案不是有效的 JSON 備份，請重新選擇匯出檔。';
 return error instanceof Error?error.message:fallback;
}
