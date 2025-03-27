import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

/**
 * 文件讀取工具 - 讀取程式碼檔案並添加行號
 */
export class myFileReader {
    /**
     * 讀取程式碼文件並添加行號
     * @param filePath 檔案路徑
     * @returns 帶行號的檔案內容
     */
    static async readFileWithLineNumbers(filePath: string): Promise<string> {
        try {
            // 檢查檔案是否存在
            if (!existsSync(filePath)) {
                return `錯誤: 檔案 ${filePath} 不存在`;
            }

            // 讀取檔案內容
            const content = await fs.readFile(filePath, 'utf8');
            const lines = content.split(/\r?\n/);

            // 計算行號寬度 (最大行號的位數)
            const lineNumberWidth = lines.length.toString().length;
            
            // 為每行添加行號
            const numberedLines = lines.map((line, index) => {
                const lineNumber = (index + 1).toString().padStart(lineNumberWidth, '0');
                return `${lineNumber}: ${line}`;
            });

            return numberedLines.join('\n');
        } catch (error) {
            console.error(`讀取檔案時發生錯誤: ${error}`);
            return `讀取檔案時發生錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`;
        }
    }
}
