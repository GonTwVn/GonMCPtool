import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

/**
 * 程式碼搜尋工具，用於在允許的目錄中搜尋特定內容的檔案
 */
export class CodeSearchTool {
    /**
     * 獲取硬編碼的允許目錄列表
     * @returns 允許的目錄列表
     */
    private static getAllowedDirectories(): string[] {
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
    
    /**
     * 在指定檔案中搜尋特定內容
     * @param filePath 檔案路徑
     * @param searchText 要搜尋的文字
     * @param caseSensitive 是否區分大小寫
     * @returns 包含匹配行和行號的搜尋結果陣列
     */
    public static async searchInFile(
        filePath: string,
        searchText: string,
        caseSensitive: boolean = false
    ): Promise<{ line: string, lineNumber: number }[]> {
        const readFile = util.promisify(fs.readFile);
        
        try {
            // 檢查是否為文字檔案 (使用一些常見的文字檔案副檔名判斷)
            const ext = path.extname(filePath).toLowerCase();
            const textExtensions = [
                '.ts', '.js', '.tsx', '.jsx', '.html', '.css', '.scss', '.less',
                '.json', '.xml', '.md', '.txt', '.cs', '.java', '.py', '.rb', 
                '.c', '.cpp', '.h', '.hpp', '.go', '.rs', '.php', '.swift'
            ];
            
            if (!textExtensions.includes(ext)) {
                return [];
            }
            
            const content = await readFile(filePath, 'utf8');
            const lines = content.split(/\r?\n/);
            const results: { line: string, lineNumber: number }[] = [];
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                // 根據是否區分大小寫來檢查行是否包含搜尋文字
                if ((caseSensitive && line.includes(searchText)) || 
                    (!caseSensitive && line.toLowerCase().includes(searchText.toLowerCase()))) {
                    results.push({
                        line: line.trim(),
                        lineNumber: i + 1 // 行號從1開始
                    });
                }
            }
            
            return results;
        } catch (error) {
            console.error(`無法讀取檔案 ${filePath}: ${error instanceof Error ? error.message : '未知錯誤'}`);
            return [];
        }
    }
    
    /**
     * 將簡單的通配符模式轉換為正規表達式
     * @param fileName 檔案名稱
     * @param pattern 檔名模式（支援 * 和 ? 通配符）
     * @returns 是否符合模式
     */
    private static matchesPattern(fileName: string, pattern: string): boolean {
        // 轉換特殊字符
        let regexPattern = pattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&')
            .replace(/\*/g, '.*')  // * 轉換為 .*
            .replace(/\?/g, '.');  // ? 轉換為 .
        
        return new RegExp(`^${regexPattern}$`, 'i').test(fileName);  // 不區分大小寫
    }
    
    /**
     * 在目錄及其子目錄中的所有檔案中搜尋特定內容
     * @param dir 目錄路徑
     * @param searchText 要搜尋的文字
     * @param excludeDirs 要排除的目錄
     * @param caseSensitive 是否區分大小寫
     * @param filePattern 選擇性的檔案模式過濾器
     * @returns 搜尋結果物件
     */
    private static async searchInDirectory(
        dir: string,
        searchText: string,
        excludeDirs: string[] = [],
        caseSensitive: boolean = false,
        filePattern: string = '*'
    ): Promise<Map<string, { line: string, lineNumber: number }[]>> {
        // 將在指定目錄中递歸尋找檔案
        const results = new Map<string, { line: string, lineNumber: number }[]>();
        const readdir = util.promisify(fs.readdir);
        const stat = util.promisify(fs.stat);
        
        try {
            // 檢查目錄是否存在
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
                    // 递歷搜尋子目錄
                    const subDirResults = await this.searchInDirectory(
                        fullPath, searchText, excludeDirs, caseSensitive, filePattern
                    );
                    
                    // 合併子目錄的搜尋結果
                    for (const [subPath, matches] of subDirResults.entries()) {
                        results.set(subPath, matches);
                    }
                } else {
                    // 檢查檔案名是否符合模式
                    if (this.matchesPattern(file, filePattern)) {
                        const fileResults = await this.searchInFile(fullPath, searchText, caseSensitive);
                        if (fileResults.length > 0) {
                            results.set(fullPath, fileResults);
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`無法讀取目錄 ${dir}: ${error instanceof Error ? error.message : '未知錯誤'}`);
        }
        
        return results;
    }
    
    /**
     * 在所有允許的目錄中搜尋特定內容
     * @param searchText 要搜尋的文字
     * @param excludeDirs 要排除的目錄
     * @param caseSensitive 是否區分大小寫
     * @param filePattern 選擇性的檔案模式過濾器
     * @param maxResults 最大結果數量
     * @param maxContextLines 每個檔案的最大上下文行數
     * @returns 格式化的搜尋結果字串
     */
    public static async searchInAllowedDirectories(
        searchText: string,
        excludeDirs: string[] = ['node_modules', '.git', 'dist', 'bin', 'obj'],
        caseSensitive: boolean = false,
        filePattern: string = '*',
        maxResults: number = 1000,
        maxContextLines: number = 5
    ): Promise<string> {
        try {
            if (!searchText || searchText.trim() === '') {
                return '錯誤: 請提供要搜尋的文字';
            }
            
            // 獲取允許的目錄
            const allowedDirs = this.getAllowedDirectories();
            
            // 檢查是否有允許的目錄
            if (allowedDirs.length === 0) {
                return '錯誤：未提供允許的目錄參數。請在啟動時指定至少一個允許的目錄。';
            }
            
            let totalResults = 0;
            let formattedResults = '';
            let allFilesFound = 0;
            
            for (const dir of allowedDirs) {
                if (!fs.existsSync(dir)) {
                    continue;
                }
                
                const dirResults = await this.searchInDirectory(
                    dir, searchText, excludeDirs, caseSensitive, filePattern
                );
                
                allFilesFound += dirResults.size;
                
                for (const [file, matches] of dirResults.entries()) {
                    if (totalResults >= maxResults) {
                        break;
                    }
                    
                    const relativePath = file.replace(dir, dir.split(path.sep).pop() || path.basename(dir));
                    formattedResults += `\n檔案: ${relativePath} (${matches.length} 個匹配)\n`;
                    
                    // 限制每個檔案的匹配數量
                    const displayMatches = matches.slice(0, maxContextLines);
                    for (const match of displayMatches) {
                        formattedResults += `  行 ${match.lineNumber}: ${match.line}\n`;
                        totalResults++;
                    }
                    
                    if (matches.length > maxContextLines) {
                        formattedResults += `  ... 以及 ${matches.length - maxContextLines} 個更多匹配\n`;
                    }
                    
                    formattedResults += '\n';
                }
                
                if (totalResults >= maxResults) {
                    formattedResults += `\n達到最大結果數量限制 (${maxResults})，可能還有更多匹配項未顯示。`;
                    break;
                }
            }
            
            if (formattedResults === '') {
                return `在允許的目錄中未找到包含 "${searchText}" 的檔案`;
            }
            
            return `找到 ${totalResults} 個匹配項，分佈在 ${allFilesFound} 個檔案中：${formattedResults}`;
        } catch (error) {
            return `搜尋過程中發生錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`;
        }
    }
}
