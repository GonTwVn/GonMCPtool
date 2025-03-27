import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

/**
 * 文件搜尋工具，用於在允許的目錄中搜尋符合指定檔名的檔案
 */
export class FileSearchTool {
    /**
     * 在指定目錄及子目錄中搜尋符合特定檔名模式的檔案
     * @param rootDir 要搜尋的根目錄
     * @param filePattern 檔名模式（支援簡單的通配符 * 和 ?）
     * @param excludeDirs 要排除的目錄名稱陣列
     * @returns 找到的檔案路徑陣列
     */
    public static async searchFiles(
        rootDir: string, 
        filePattern: string,
        excludeDirs: string[] = []
    ): Promise<string[]> {
        const readdir = util.promisify(fs.readdir);
        const stat = util.promisify(fs.stat);
        const results: string[] = [];

        // 將文件模式轉換為正則表達式
        const patternRegex = this.convertPatternToRegex(filePattern);

        // 遞迴搜尋函數
        async function searchDir(dir: string) {
            try {
                // 檢查是否有權限讀取目錄
                await util.promisify(fs.access)(dir, fs.constants.R_OK);
                
                const files = await readdir(dir);
                
                for (const file of files) {
                    // 跳過排除的目錄
                    if (excludeDirs.includes(file)) {
                        continue;
                    }
                    
                    const fullPath = path.join(dir, file);
                    const fileStat = await stat(fullPath);
                    
                    if (fileStat.isDirectory()) {
                        // 遞迴搜尋子目錄
                        await searchDir(fullPath);
                    } else if (patternRegex.test(file)) {
                        // 檔名符合模式
                        results.push(fullPath);
                    }
                }
            } catch (error) {
                // 忽略讀取目錄失敗的錯誤
                console.error(`無法讀取目錄 ${dir}: ${error instanceof Error ? error.message : '未知錯誤'}`);
            }
        }

        // 開始搜尋
        await searchDir(rootDir);
        return results;
    }

    /**
     * 在多個允許的目錄中搜尋符合檔名模式的檔案
     * @param allowedDirs 允許搜尋的目錄列表
     * @param filePattern 檔名模式
     * @param excludeDirs 要排除的目錄名稱陣列
     * @returns 結果訊息字串
     */
    public static async searchFilesInAllowedDirs(
        allowedDirs: string[],
        filePattern: string,
        excludeDirs: string[] = ['node_modules', '.git', 'dist', 'bin', 'obj']
    ): Promise<string> {
        try {
            if (!filePattern) {
                return '錯誤: 請提供檔名模式';
            }
                        // 檢查是否有允許的目錄
                        if (allowedDirs.length === 0) {
                            return '錯誤：未提供允許的目錄參數。請在啟動時指定至少一個允許的目錄。';
                        }

            let allResults: string[] = [];
            
            for (const dir of allowedDirs) {
                // 檢查目錄是否存在
                if (!fs.existsSync(dir)) {
                    continue;
                }
                
                const results = await this.searchFiles(dir, filePattern, excludeDirs);
                allResults = allResults.concat(results);
            }

            if (allResults.length === 0) {
                return `未找到符合模式 "${filePattern}" 的檔案`;
            }

            // 將搜尋結果格式化為字串
            const formattedResults = allResults
                .map((filePath, index) => `${index + 1}. ${filePath}`)
                .join('\n');

            return `找到 ${allResults.length} 個符合模式 "${filePattern}" 的檔案：\n${formattedResults}`;
        } catch (error) {
            return `搜尋檔案失敗: ${error instanceof Error ? error.message : '未知錯誤'}`;
        }
    }

    /**
     * 將簡單的通配符模式轉換為正則表達式
     * @param pattern 檔名模式（支援 * 和 ? 通配符）
     * @returns 正則表達式對象
     */
    private static convertPatternToRegex(pattern: string): RegExp {
        // 轉義特殊字符
        let regexPattern = pattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&')
            .replace(/\*/g, '.*')  // * 轉換為 .*
            .replace(/\?/g, '.');  // ? 轉換為 .
        
        return new RegExp(`^${regexPattern}$`, 'i');  // 不區分大小寫
    }

    /**
     * 獲取允許的目錄列表 - 直接使用硬編碼方式
     * @returns 允許的目錄列表
     */
    public static async getAllowedDirectories(): Promise<string[]> {
        // 從命令行參數獲取允許的目錄（從第2個參數開始，因為第1個是Node路徑，第2個是腳本路徑）
        const args = process.argv.slice(2);
        
        // 如果命令行中有額外參數，則這些參數被視為允許的目錄
        if (args && args.length > 0) {
            return args;
        }
        
        // 因沒有提供命令行參數，因此回報錯誤
        console.error('錯誤：未提供允許的目錄參數。請在啟動時指定至少一個允許的目錄。');
        console.error('使用範例：');
        console.error('node [dist路徑]/main.js "C:\\path\\to\\allowed\\directory1" "C:\\path\\to\\allowed\\directory2"');
        
        // 返回空陣列，表示沒有允許的目錄
        return [];
    }
}
