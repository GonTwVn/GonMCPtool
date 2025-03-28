import fs from 'fs/promises';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';

/**
 * 檔案寫入與讀取工具 - 提供簡單的檔案建立、編輯與讀取功能
 */
export class FileWriterTool {    
    /**
     * 讀取檔案內容
     * @param filePath 檔案路徑
     * @param encoding 編碼方式，默認為 utf8
     * @returns 檔案內容或錯誤訊息
     */
    static async readTextFile(filePath: string, encoding: BufferEncoding = 'utf8'): Promise<string> {
        try {
            // 檢查檔案是否存在
            if (!existsSync(filePath)) {
                return `錯誤: 檔案 ${filePath} 不存在`;
            }

            // 讀取檔案內容
            const content = await fs.readFile(filePath, { encoding });
            return content;
        } catch (error) {
            console.error(`讀取檔案時發生錯誤: ${error}`);
            return `讀取檔案時發生錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`;
        }
    }

    /**
     * 讀取JSON檔案並解析
     * @param filePath 檔案路徑
     * @returns 解析後的JSON物件或錯誤訊息
     */
    static async readJsonFile(filePath: string): Promise<{ success: boolean; data?: any; error?: string }> {
        try {
            // 讀取檔案
            const content = await this.readTextFile(filePath);
            
            // 如果讀取出錯，返回錯誤
            if (content.startsWith('錯誤') || content.startsWith('讀取檔案時發生錯誤')) {
                return { success: false, error: content };
            }

            // 解析JSON
            try {
                const jsonData = JSON.parse(content);
                return { success: true, data: jsonData };
            } catch (parseError) {
                return { 
                    success: false, 
                    error: `JSON解析錯誤: ${parseError instanceof Error ? parseError.message : '未知錯誤'}` 
                };
            }
        } catch (error) {
            return { 
                success: false, 
                error: `讀取JSON檔案時發生錯誤: ${error instanceof Error ? error.message : '未知錯誤'}` 
            };
        }
    }
    /**
     * 寫入文字內容到檔案
     * @param filePath 檔案路徑
     * @param content 要寫入的內容
     * @param createDirs 是否自動創建目錄，默認為true
     * @returns 操作結果訊息
     */
    static async writeTextToFile(filePath: string, content: string, createDirs: boolean = true): Promise<string> {
        try {
            // 獲取目錄路徑
            const directory = path.dirname(filePath);
            
            // 檢查並創建目錄（如果不存在且createDirs為true）
            if (createDirs && !existsSync(directory)) {
                mkdirSync(directory, { recursive: true });
                console.log(`已創建目錄: ${directory}`);
            }
            
            // 寫入檔案
            await fs.writeFile(filePath, content, 'utf8');
            
            return `檔案已成功寫入: ${filePath}`;
        } catch (error) {
            console.error(`寫入檔案時發生錯誤: ${error}`);
            return `寫入檔案時發生錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`;
        }
    }
    
    /**
     * 將JSON物件寫入檔案
     * @param filePath 檔案路徑
     * @param data 要寫入的JSON數據
     * @param pretty 是否美化輸出（添加縮排），默認為true
     * @param createDirs 是否自動創建目錄，默認為true
     * @returns 操作結果訊息
     */
    static async writeJsonToFile(filePath: string, data: any, pretty: boolean = true, createDirs: boolean = true): Promise<string> {
        try {
            // 將數據轉換為JSON字符串
            const jsonContent = pretty 
                ? JSON.stringify(data, null, 2) 
                : JSON.stringify(data);
                
            // 使用文本寫入方法寫入JSON內容
            return await this.writeTextToFile(filePath, jsonContent, createDirs);
        } catch (error) {
            console.error(`將JSON寫入檔案時發生錯誤: ${error}`);
            return `將JSON寫入檔案時發生錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`;
        }
    }
    
    /**
     * 追加文本到已有檔案
     * @param filePath 檔案路徑
     * @param content 要追加的內容
     * @param createIfNotExist 如果文件不存在是否創建新文件，默認為true
     * @returns 操作結果訊息
     */
    static async appendTextToFile(filePath: string, content: string, createIfNotExist: boolean = true): Promise<string> {
        try {
            // 檢查檔案是否存在
            const fileExists = existsSync(filePath);
            
            // 如果檔案不存在且不需要創建，則返回錯誤
            if (!fileExists && !createIfNotExist) {
                return `錯誤: 檔案 ${filePath} 不存在`;
            }
            
            // 獲取目錄路徑（如果需要創建文件）
            if (!fileExists && createIfNotExist) {
                const directory = path.dirname(filePath);
                if (!existsSync(directory)) {
                    mkdirSync(directory, { recursive: true });
                }
            }
            
            // 追加內容到檔案
            await fs.appendFile(filePath, content, 'utf8');
            
            return `內容已成功追加到檔案: ${filePath}`;
        } catch (error) {
            console.error(`追加內容到檔案時發生錯誤: ${error}`);
            return `追加內容到檔案時發生錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`;
        }
    }
}