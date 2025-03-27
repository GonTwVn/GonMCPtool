import fs from 'fs/promises';
import { existsSync } from 'fs';

/**
 * 文件行間刪除工具 - 刪除指定範圍的行
 */
export class myFileDelete {
    /**
     * 刪除指定範圍的行
     * @param filePath 檔案路徑
     * @param startLine 起始行（包含）
     * @param endLine 結束行（包含），如果未提供則只刪除起始行
     * @returns 操作結果訊息
     */
    static async deleteLines(
        filePath: string, 
        startLine: number, 
        endLine?: number
    ): Promise<string> {
        try {
            // 檢查檔案是否存在
            if (!existsSync(filePath)) {
                return `錯誤: 檔案 ${filePath} 不存在`;
            }

            // 設置結束行，如果未提供則等於起始行
            const effectiveEndLine = endLine || startLine;
            
            // 確保起始行小於等於結束行
            if (startLine > effectiveEndLine) {
                return `錯誤: 起始行 ${startLine} 大於結束行 ${effectiveEndLine}`;
            }

            // 讀取檔案內容
            const fileContent = await fs.readFile(filePath, 'utf8');
            const lines = fileContent.split(/\r?\n/);

            // 檢查行號是否有效
            if (startLine < 1 || startLine > lines.length) {
                return `錯誤: 起始行 ${startLine} 超出範圍，檔案共有 ${lines.length} 行`;
            }
            if (effectiveEndLine < 1 || effectiveEndLine > lines.length) {
                return `錯誤: 結束行 ${effectiveEndLine} 超出範圍，檔案共有 ${lines.length} 行`;
            }

            // 刪除指定範圍的行
            lines.splice(startLine - 1, effectiveEndLine - startLine + 1);

            // 寫回檔案
            await fs.writeFile(filePath, lines.join('\n'), 'utf8');

            if (startLine === effectiveEndLine) {
                return `成功刪除第 ${startLine} 行`;
            } else {
                return `成功刪除第 ${startLine} 行到第 ${effectiveEndLine} 行`;
            }
        } catch (error) {
            console.error(`刪除內容時發生錯誤: ${error}`);
            return `刪除內容時發生錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`;
        }
    }
}
