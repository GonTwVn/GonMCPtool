import fs from 'fs/promises';
import { existsSync } from 'fs';

/**
 * 檔案編輯工具 - 提供對現有檔案進行局部編輯的功能
 */
export class FileEditorTool {
    /**
     * 編輯檔案 - 替換檔案中的特定文字
     * @param filePath 檔案路徑
     * @param edits 編輯操作列表，每個操作包含 oldText 和 newText
     * @param dryRun 是否僅預覽變更（不實際修改檔案）
     * @returns 操作結果訊息或差異預覽
     */
    static async editFile(
        filePath: string, 
        edits: Array<{oldText: string, newText: string}>, 
        dryRun: boolean = false
    ): Promise<string> {
        try {
            // 檢查檔案是否存在
            if (!existsSync(filePath)) {
                return `錯誤: 檔案 ${filePath} 不存在`;
            }

            // 讀取檔案內容
            let content = await fs.readFile(filePath, 'utf8');
            let originalContent = content;
            
            // 套用所有編輯
            for (const edit of edits) {
                const { oldText, newText } = edit;
                
                // 檢查 oldText 是否存在且唯一
                const count = (content.match(new RegExp(this.escapeRegExp(oldText), 'g')) || []).length;
                if (count === 0) {
                    return `錯誤: 在檔案中找不到文字「${oldText}」`;
                }
                if (count > 1) {
                    return `錯誤: 文字「${oldText}」在檔案中出現多次 (${count} 次)，無法確定要替換哪一個`;
                }
                
                // 替換文字
                content = content.replace(oldText, newText);
            }
            
            // 如果是預覽模式，生成差異報告
            if (dryRun) {
                return this.generateDiff(originalContent, content, filePath);
            }
            
            // 寫入檔案
            await fs.writeFile(filePath, content, 'utf8');
            
            return `檔案已成功編輯: ${filePath}，共應用了 ${edits.length} 個修改`;
        } catch (error) {
            console.error(`編輯檔案時發生錯誤: ${error}`);
            return `編輯檔案時發生錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`;
        }
    }
    
    /**
     * 在檔案指定位置插入文字
     * @param filePath 檔案路徑
     * @param position 插入位置 (行號或位置標記)
     * @param content 要插入的內容
     * @param dryRun 是否僅預覽變更（不實際修改檔案）
     * @returns 操作結果訊息或差異預覽
     */
    static async insertIntoFile(
        filePath: string, 
        position: number | string, 
        content: string, 
        dryRun: boolean = false
    ): Promise<string> {
        try {
            // 檢查檔案是否存在
            if (!existsSync(filePath)) {
                return `錯誤: 檔案 ${filePath} 不存在`;
            }

            // 讀取檔案內容
            let fileContent = await fs.readFile(filePath, 'utf8');
            let originalContent = fileContent;
            let lines = fileContent.split(/\r?\n/);
            
            // 處理不同的插入位置類型
            if (typeof position === 'number') {
                // 按行號插入（行號從1開始）
                if (position < 1 || position > lines.length + 1) {
                    return `錯誤: 行號 ${position} 超出範圍 (1 - ${lines.length + 1})`;
                }
                
                // 在指定行前插入
                const insertIndex = position - 1;
                lines.splice(insertIndex, 0, content);
                fileContent = lines.join('\n');
            } else if (typeof position === 'string') {
                // 按標記字符串插入
                if (!fileContent.includes(position)) {
                    return `錯誤: 在檔案中找不到標記「${position}」`;
                }
                
                // 在標記後插入
                fileContent = fileContent.replace(position, position + content);
            }
            
            // 如果是預覽模式，生成差異報告
            if (dryRun) {
                return this.generateDiff(originalContent, fileContent, filePath);
            }
            
            // 寫入檔案
            await fs.writeFile(filePath, fileContent, 'utf8');
            
            return `內容已成功插入檔案: ${filePath}`;
        } catch (error) {
            console.error(`插入內容時發生錯誤: ${error}`);
            return `插入內容時發生錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`;
        }
    }
    
    /**
     * 從檔案刪除特定範圍的內容
     * @param filePath 檔案路徑
     * @param selector 要刪除的內容選擇器 (可以是文字、行範圍等)
     * @param dryRun 是否僅預覽變更（不實際修改檔案）
     * @returns 操作結果訊息或差異預覽
     */
    static async deleteFromFile(
        filePath: string, 
        selector: string | {startLine: number, endLine?: number} | {start: string, end: string}, 
        dryRun: boolean = false
    ): Promise<string> {
        try {
            // 檢查檔案是否存在
            if (!existsSync(filePath)) {
                return `錯誤: 檔案 ${filePath} 不存在`;
            }

            // 讀取檔案內容
            let fileContent = await fs.readFile(filePath, 'utf8');
            let originalContent = fileContent;
            
            // 根據不同的選擇器類型處理刪除操作
            if (typeof selector === 'string') {
                // 刪除特定文字
                if (!fileContent.includes(selector)) {
                    return `錯誤: 在檔案中找不到文字「${selector}」`;
                }
                
                fileContent = fileContent.replace(selector, '');
            } else if ('startLine' in selector) {
                // 刪除行範圍
                const lines = fileContent.split(/\r?\n/);
                const startLine = selector.startLine;
                const endLine = selector.endLine || startLine;
                
                if (startLine < 1 || startLine > lines.length || endLine < startLine || endLine > lines.length) {
                    return `錯誤: 行範圍 ${startLine}-${endLine} 超出檔案範圍 (1-${lines.length})`;
                }
                
                // 刪除指定行範圍
                lines.splice(startLine - 1, endLine - startLine + 1);
                fileContent = lines.join('\n');
            } else if ('start' in selector && 'end' in selector) {
                // 刪除兩個標記之間的內容
                const startPos = fileContent.indexOf(selector.start);
                const endPos = fileContent.indexOf(selector.end, startPos + selector.start.length);
                
                if (startPos === -1 || endPos === -1) {
                    return `錯誤: 在檔案中找不到指定的標記範圍`;
                }
                
                // 刪除開始標記到結束標記之間的內容（包括標記）
                const beforeStart = fileContent.substring(0, startPos);
                const afterEnd = fileContent.substring(endPos + selector.end.length);
                fileContent = beforeStart + afterEnd;
            }
            
            // 如果是預覽模式，生成差異報告
            if (dryRun) {
                return this.generateDiff(originalContent, fileContent, filePath);
            }
            
            // 寫入檔案
            await fs.writeFile(filePath, fileContent, 'utf8');
            
            return `內容已成功從檔案刪除: ${filePath}`;
        } catch (error) {
            console.error(`刪除內容時發生錯誤: ${error}`);
            return `刪除內容時發生錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`;
        }
    }
    
    /**
     * 生成簡單的差異報告
     * @param oldContent 原始內容
     * @param newContent 新內容
     * @param filePath 檔案路徑
     * @returns 差異報告
     */
    private static generateDiff(oldContent: string, newContent: string, filePath: string): string {
        const oldLines = oldContent.split(/\r?\n/);
        const newLines = newContent.split(/\r?\n/);
        
        let diff = `差異預覽 - ${filePath}\n`;
        diff += `===================================================================\n`;
        
        // 簡單的差異檢測
        if (oldContent === newContent) {
            return '沒有變更';
        }
        
        // 尋找不同的行
        for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
            const oldLine = i < oldLines.length ? oldLines[i] : '';
            const newLine = i < newLines.length ? newLines[i] : '';
            
            if (oldLine !== newLine) {
                diff += `行 ${i+1}:\n`;
                diff += `- ${oldLine}\n`;
                diff += `+ ${newLine}\n\n`;
            }
        }
        
        return diff;
    }
    
    /**
     * 轉義正則表達式特殊字符
     * @param string 要轉義的字符串
     * @returns 轉義後的字符串
     */
    private static escapeRegExp(string: string): string {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}