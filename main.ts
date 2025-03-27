// 主要導入網統模組
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { NpmBuildTool } from "./tools/npmBuildTool.js";
import { NpmInstallTool } from "./tools/npmInstallTool.js";
import { LocalizationTool, LocalizationEntry, LongValueResult } from "./tools/localizationTool.js";
import { myFileReader } from "./tools/csFileReader.js";
import { myFileInsert } from "./tools/csLineInserter.js";
import { myFileDelete } from "./tools/csLineDeleter.js";
import { FileSearchTool } from "./tools/fileSearchTool.js";
import { CodeSearchTool } from "./tools/codeSearchTool.js";

// Create an MCP server
const server = new McpServer({
    name: "Demo",
    version: "1.0.0"
});

// Add an addition tool
server.tool("add", "簡單的加法計算工具",
    { a: z.number(), b: z.number() },
    async ({ a, b }) => ({
        content: [{ type: "text", text: String(a + b) }]
    })
);

// Add npm build tool
server.tool("npmBuild",
    "執行npm build命令構建專案",
    { path: z.string().optional(), options: z.string().optional() },
    async ({ path = ".", options = "" }) => {
        try {
            const result = await NpmBuildTool.executeBuild(path, options);
            return {
                content: [{ type: "text", text: `Build completed successfully: ${result.stdout}` }]
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `Build failed: ${error instanceof Error ? error.message : "Unknown error"}` }]
            };
        }
    }
);

// Add npm install tool
server.tool("npmInstall",
    "執行npm install命令安裝依賴",
    { path: z.string().optional(), options: z.string().optional() },
    async ({ path = ".", options = "" }) => {
        try {
            const result = await NpmInstallTool.executeInstall(path, options);
            return {
                content: [{ type: "text", text: `Dependencies installed successfully: ${result.stdout}` }]
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `Installation failed: ${error instanceof Error ? error.message : "Unknown error"}` }]
            };
        }
    }
);


// Add file tools
server.tool("codeFileRead",
    "讀取程式碼檔案並顯示行號，用於確認檔案實際行數以便編輯操作。(如果不影響編譯器的話，不需要針對縮排等小問題修改。提醒User就好了)",
    { filePath: z.string() },
    async ({ filePath }) => {
        try {
            const result = await myFileReader.readFileWithLineNumbers(filePath);
            return {
                content: [{ type: "text", text: result }]
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `讀取檔案失敗: ${error instanceof Error ? error.message : "未知錯誤"}` }]
            };
        }
    }
);

server.tool("codeLineInsert",
    "每次使用前、使用後必須先使用(codeFileRead)。在程式碼檔案指定行後插入內容。(如果不影響編譯器的話，不需要針對縮排等小問題修改。提醒User就好了)",
    {
        filePath: z.string(),
        lineNumber: z.number(),
        content: z.string(),
        indentToMatch: z.boolean().optional()
    },
    async ({ filePath, lineNumber, content, indentToMatch = true }) => {
        try {
            const result = await myFileInsert.insertAfterLine(filePath, lineNumber, content, indentToMatch);
            return {
                content: [{ type: "text", text: result }]
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `插入內容失敗: ${error instanceof Error ? error.message : "未知錯誤"}` }]
            };
        }
    }
);

server.tool("codeLineDelete",
    "每次使用前、使用後必須先使用(codeFileRead)。刪除程式碼檔案指定範圍的行。(如果不影響編譯器的話，不需要針對縮排等小問題修改。提醒User就好了)",
    {
        filePath: z.string(),
        startLine: z.number(),
        endLine: z.number().optional()
    },
    async ({ filePath, startLine, endLine }) => {
        try {
            const result = await myFileDelete.deleteLines(filePath, startLine, endLine);
            return {
                content: [{ type: "text", text: result }]
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `刪除內容失敗: ${error instanceof Error ? error.message : "未知錯誤"}` }]
            };
        }
    }
);

// Add localization tools

// 1. 查詢特定Key的翻譯
server.tool("localizationGetByKey",
    "根據Key查詢特定翻譯項目",
    { filePath: z.string(), key: z.string() },
    async ({ filePath, key }) => {
        try {
            const entry = await LocalizationTool.getEntryByKey(filePath, key);
            return {
                content: [{ type: "text", text: JSON.stringify(entry, null, 2) }]
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `查詢失敗: ${error instanceof Error ? error.message : "未知錯誤"}` }]
            };
        }
    }
);

// 2. 搜尋包含特定文字的翻譯
server.tool("localizationSearch",
    "搜尋包含特定文字的翻譯項目",
    {
        filePath: z.string(),
        searchText: z.string(),
        language: z.string().optional(),
        limit: z.number().optional()
    },
    async ({ filePath, searchText, language = '', limit = 10 }) => {
        try {
            const results = await LocalizationTool.searchEntries(filePath, searchText, language, limit);
            return {
                content: [{ type: "text", text: JSON.stringify(results, null, 2) }]
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `搜尋失敗: ${error instanceof Error ? error.message : "未知錯誤"}` }]
            };
        }
    }
);

// 3. 新增翻譯項目
server.tool("localizationAdd",
    "新增一個完整的翻譯項目",
    {
        filePath: z.string(),
        entry: z.object({
            Key: z.string(),
            "zh-TW": z.string(),
            "zh-CN": z.string(),
            en: z.string()
        }).passthrough()
    },
    async ({ filePath, entry }) => {
        try {
            const result = await LocalizationTool.addEntry(filePath, entry as LocalizationEntry);
            return {
                content: [{ type: "text", text: result }]
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `新增失敗: ${error instanceof Error ? error.message : "未知錯誤"}` }]
            };
        }
    }
);

// 4. 更新翻譯項目
server.tool("localizationUpdate",
    "更新現有翻譯項目的內容",
    {
        filePath: z.string(),
        key: z.string(),
        updateData: z.object({
            "zh-TW": z.string().optional(),
            "zh-CN": z.string().optional(),
            en: z.string().optional()
        }).passthrough()
    },
    async ({ filePath, key, updateData }) => {
        try {
            const result = await LocalizationTool.updateEntry(filePath, key, updateData as Partial<Omit<LocalizationEntry, "Key">>);
            return {
                content: [{ type: "text", text: result }]
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `更新失敗: ${error instanceof Error ? error.message : "未知錯誤"}` }]
            };
        }
    }
);

// 5. 刪除翻譯項目
server.tool("localizationDelete",
    "刪除指定Key的翻譯項目",
    { filePath: z.string(), key: z.string() },
    async ({ filePath, key }) => {
        try {
            const result = await LocalizationTool.deleteEntry(filePath, key);
            return {
                content: [{ type: "text", text: result }]
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `刪除失敗: ${error instanceof Error ? error.message : "未知錯誤"}` }]
            };
        }
    }
);

// 6. 匯出特定語言的翻譯為JSON
server.tool("localizationExportJson",
    "將特定語言的翻譯導出為JSON格式",
    { filePath: z.string(), language: z.string() },
    async ({ filePath, language }) => {
        try {
            const result = await LocalizationTool.exportLanguageAsJson(filePath, language);
            return {
                content: [{ type: "text", text: result }]
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `匯出失敗: ${error instanceof Error ? error.message : "未知錯誤"}` }]
            };
        }
    }
);

// 7. 搜尋有Key值但缺少某語言翻譯的項目
server.tool("localizationFindMissing",
    "查找有Key值但缺少特定語言翻譯的項目",
    {
        filePath: z.string(),
        language: z.string(),
        limit: z.number().optional()
    },
    async ({ filePath, language, limit = 50 }) => {
        try {
            const results = await LocalizationTool.findMissingTranslations(filePath, language, limit);
            return {
                content: [{ type: "text", text: JSON.stringify(results, null, 2) }]
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `搜尋缺少翻譯項目失敗: ${error instanceof Error ? error.message : "未知錯誤"}` }]
            };
        }
    }
);

// 8. 搜尋超過特定字數的翻譯項目
server.tool("localizationFindLongValues",
    "查找超過特定字數的翻譯項目",
    {
        filePath: z.string(),
        threshold: z.number(),
        language: z.string().optional(),
        limit: z.number().optional()
    },
    async ({ filePath, threshold, language = '', limit = 50 }) => {
        try {
            const results = await LocalizationTool.findLongValues(filePath, threshold, language, limit);
            return {
                content: [{ type: "text", text: JSON.stringify(results, null, 2) }]
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `搜尋超長文字失敗: ${error instanceof Error ? error.message : "未知錯誤"}` }]
            };
        }
    }
);

// 新增文件搜尋工具 - 在允許的目錄中搜尋符合檔名的檔案
server.tool("find_files",
    "在允許的目錄中找尋所有符合檔名模式的檔案並標示其檔案路徑",
    {
        filePattern: z.string(), 
        excludeDirs: z.array(z.string()).optional()
    },
    async ({ filePattern, excludeDirs = ['node_modules', '.git', 'dist', 'bin', 'obj'] }) => {
        try {
            // 獲取允許的目錄列表
            const allowedDirs = await FileSearchTool.getAllowedDirectories();
            
            // 檢查是否有允許的目錄
            if (allowedDirs.length === 0) {
                return {
                    content: [{ type: "text", text: '錯誤：未提供允許的目錄參數。請在啟動時指定至少一個允許的目錄。' }]
                };
            }
            
            // 在允許的目錄中搜尋檔案
            const result = await FileSearchTool.searchFilesInAllowedDirs(allowedDirs, filePattern, excludeDirs);
            
            return {
                content: [{ type: "text", text: result }]
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `搜尋檔案失敗: ${error instanceof Error ? error.message : "未知錯誤"}` }]
            };
        }
    }
);

// 新增程式碼全域搜尋工具
server.tool("search_code",
    "在允許的目錄中搜尋包含特定文字的程式碼",
    {
        searchText: z.string(),
        filePattern: z.string().optional(),
        excludeDirs: z.array(z.string()).optional(),
        caseSensitive: z.boolean().optional(),
        maxResults: z.number().optional(),
        maxContextLines: z.number().optional()
    },
    async ({ 
        searchText, 
        filePattern = '*', 
        excludeDirs = ['node_modules', '.git', 'dist', 'bin', 'obj'],
        caseSensitive = false,
        maxResults = 1000,
        maxContextLines = 5
    }) => {
        try {
            // 在允許的目錄中搜尋程式碼
            const result = await CodeSearchTool.searchInAllowedDirectories(
                searchText,
                excludeDirs,
                caseSensitive,
                filePattern,
                maxResults,
                maxContextLines
            );
            
            return {
                content: [{ type: "text", text: result }]
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `搜尋程式碼失敗: ${error instanceof Error ? error.message : "未知錯誤"}` }]
            };
        }
    }
);

// Add a dynamic greeting resource
server.resource(
    "greeting",
    new ResourceTemplate("greeting://{name}", { list: undefined }),
    async (uri, { name }) => ({
        contents: [{
            uri: uri.href,
            text: `Hello, ${name}!`
        }]
    })
);

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);