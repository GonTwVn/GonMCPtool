import fs from 'fs/promises';
import { existsSync } from 'fs';

/**
 * 文件行間插入工具 - 在指定行插入內容
 */
export class myFileInsert {
    /**
     * 在指定行插入內容
     * @param filePath 檔案路徑
     * @param lineNumber 行號（在此行插入內容，原內容將向下移動）
     * @param content 要插入的內容
     * @param indentToMatch 是否匹配目標行的縮排
     * @returns 操作結果訊息
     */
    static async insertAtLine(
        filePath: string, 
        lineNumber: number, 
        content: string, 
        indentToMatch: boolean = true
    ): Promise<string> {
        try {
            // 檢查檔案是否存在
            if (!existsSync(filePath)) {
                return `錯誤: 檔案 ${filePath} 不存在`;
            }

            // 讀取檔案內容
            const fileContent = await fs.readFile(filePath, 'utf8');
            const lines = fileContent.split(/\r?\n/);

            // 檢查行號是否有效
            if (lineNumber < 1 || lineNumber > lines.length) {
                return `錯誤: 行號 ${lineNumber} 超出範圍，檔案共有 ${lines.length} 行`;
            }

            // 處理縮排匹配
            let contentToInsert = content;
            if (indentToMatch) {
                const targetLine = lines[lineNumber - 1];
                const indent = targetLine.match(/^(\s*)/)?.[1] || '';
                contentToInsert = content.split(/\r?\n/).map(line => {
                    // 跳過空行的縮排處理
                    if (line.trim() === '') return line;
                    return indent + line;
                }).join('\n');
            }

            // 插入內容（在指定行號 -1 的位置插入，使原內容向下移動）
            lines.splice(lineNumber - 1, 0, contentToInsert);

            // 寫回檔案
            await fs.writeFile(filePath, lines.join('\n'), 'utf8');

            return `成功在第 ${lineNumber} 行插入內容`;
        } catch (error) {
            console.error(`插入內容時發生錯誤: ${error}`);
            return `插入內容時發生錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`;
        }
    }
}
