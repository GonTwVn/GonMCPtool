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
import { TaskManagerTool } from "./tools/taskManagerTool.js";
import { Task, TaskStep, TaskStatus, TaskFilter } from "./tools/interfaces/TaskManager.js";
import { FileWriterTool } from "./tools/fileWriterTool.js";
import { FileEditorTool } from "./tools/fileEditorTool.js";
import { TaskReportGenerator } from "./tools/taskReportGenerator.js";

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
    });

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
    "每次使用前、使用後必須先使用(codeFileRead)。在程式碼檔案指定行插入內容，原內容將向下移動。(如果不影響編譯器的話，不需要針對縮排等小問題修改。提醒User就好了)",
    {
        filePath: z.string(),
        lineNumber: z.number(),
        content: z.string(),
        indentToMatch: z.boolean().optional()
    },
    async ({ filePath, lineNumber, content, indentToMatch = true }) => {
        try {
            const result = await myFileInsert.insertAtLine(filePath, lineNumber, content, indentToMatch);
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
// 添加檔案寫入工具
server.tool("fileWrite",
    "檔案寫入功能，為文件提供建立、編輯與寫入功能",
    {
        filePath: z.string(),
        content: z.string(),
        mode: z.enum(['write', 'append', 'json']).default('write'),
        createDirs: z.boolean().optional(),
        prettify: z.boolean().optional()
    },
    async ({ filePath, content, mode = 'write', createDirs = true, prettify = true }) => {
        try {
            let result = '';

            // 根據模式選擇適當的方法
            switch (mode) {
                case 'write':
                    result = await FileWriterTool.writeTextToFile(filePath, content, createDirs);
                    break;
                case 'append':
                    result = await FileWriterTool.appendTextToFile(filePath, content, createDirs);
                    break;
                case 'json':
                    try {
                        // 嘗試解析JSON
                        const jsonData = JSON.parse(content);
                        result = await FileWriterTool.writeJsonToFile(filePath, jsonData, prettify, createDirs);
                    } catch (parseError) {
                        return {
                            content: [{ type: "text", text: `JSON格式錯誤: ${parseError instanceof Error ? parseError.message : "未知錯誤"}` }]
                        };
                    }
                    break;
            }

            return {
                content: [{ type: "text", text: result }]
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `檔案寫入失敗: ${error instanceof Error ? error.message : "未知錯誤"}` }]
            };
        }
    }
);

// 添加檔案讀取工具
server.tool("fileRead",
    "讀取檔案內容，支援純文本和JSON格式",
    {
        filePath: z.string(),
        mode: z.enum(['text', 'json']).default('text'),
        encoding: z.string().optional()
    },
    async ({ filePath, mode = 'text', encoding = 'utf8' }) => {
        try {
            if (mode === 'text') {
                const content = await FileWriterTool.readTextFile(filePath, encoding as BufferEncoding);

                // 檢查是否有錯誤
                if (content.startsWith('錯誤') || content.startsWith('讀取檔案時發生錯誤')) {
                    return {
                        content: [{ type: "text", text: content }]
                    };
                }

                return {
                    content: [{ type: "text", text: content }]
                };
            } else {
                const result = await FileWriterTool.readJsonFile(filePath);

                if (!result.success) {
                    return {
                        content: [{ type: "text", text: result.error || '讀取JSON檔案失敗' }]
                    };
                }

                return {
                    content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }]
                };
            }
        } catch (error) {
            return {
                content: [{ type: "text", text: `檔案讀取失敗: ${error instanceof Error ? error.message : "未知錯誤"}` }]
            };
        }
    }
);

// 添加檔案編輯工具
server.tool("edit_file",
    "對檔案進行精確的編輯，可以替換特定文字內容",
    {
        path: z.string(),
        edits: z.array(z.object({
            oldText: z.string().describe("要搜尋的文字 - 必須完全匹配"),
            newText: z.string().describe("替換成的新文字")
        })),
        dryRun: z.boolean().default(false).describe("預覽變更而不實際修改檔案")
    },
    async ({ path, edits, dryRun = false }) => {
        try {
            const result = await FileEditorTool.editFile(path, edits, dryRun);
            return {
                content: [{ type: "text", text: result }]
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `編輯檔案失敗: ${error instanceof Error ? error.message : "未知錯誤"}` }]
            };
        }
    }
);

// 添加檔案內容插入工具
server.tool("insert_to_file",
    "在檔案的特定位置插入新內容",
    {
        path: z.string(),
        position: z.union([
            z.number().describe("行號 (從1開始)"),
            z.string().describe("作為標記的文字，內容將插入在此標記之後")
        ]),
        content: z.string().describe("要插入的內容"),
        dryRun: z.boolean().default(false).describe("預覽變更而不實際修改檔案")
    },
    async ({ path, position, content, dryRun = false }) => {
        try {
            const result = await FileEditorTool.insertIntoFile(path, position, content, dryRun);
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

// 添加檔案內容刪除工具
server.tool("delete_from_file",
    "從檔案中刪除特定內容",
    {
        path: z.string(),
        selector: z.union([
            z.string().describe("要刪除的確切文字"),
            z.object({
                startLine: z.number().describe("開始行號 (從1開始)"),
                endLine: z.number().optional().describe("結束行號，如果省略則只刪除單行")
            }),
            z.object({
                start: z.string().describe("開始標記文字"),
                end: z.string().describe("結束標記文字")
            })
        ]),
        dryRun: z.boolean().default(false).describe("預覽變更而不實際修改檔案")
    },
    async ({ path, selector, dryRun = false }) => {
        try {
            const result = await FileEditorTool.deleteFromFile(path, selector, dryRun);
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
    }));

// 新增任務管理器工具
// 1. 創建新任務
server.tool("taskCreate",
    "創建新的任務，可以包含多個步驟",
    {
        title: z.string(),
        description: z.string(),
        steps: z.array(z.object({
            description: z.string(),
            order: z.number().optional(),
            completed: z.boolean().optional(),
            estimatedTime: z.number().optional()
        })),
        tags: z.array(z.string()).optional(),
        dueDate: z.string().optional(),
        priority: z.number().optional()
    },
    async ({ title, description, steps, tags = [], dueDate, priority = 3 }) => {
        try {
            const newTask = await TaskManagerTool.createTask(
                title,
                description,
                steps,
                tags,
                dueDate,
                priority
            );

            return {
                content: [{ type: "text", text: `任務創建成功：\n${JSON.stringify(newTask, null, 2)}` }]
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `創建任務失敗: ${error instanceof Error ? error.message : "未知錯誤"}` }]
            };
        }
    }
);

// 2. 獲取所有任務
server.tool("taskGetAll",
    "獲取所有任務列表",
    {},
    async () => {
        try {
            const tasks = await TaskManagerTool.getAllTasks();

            return {
                content: [{ type: "text", text: `獲取到 ${tasks.length} 個任務：\n${JSON.stringify(tasks, null, 2)}` }]
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `獲取任務失敗: ${error instanceof Error ? error.message : "未知錯誤"}` }]
            };
        }
    }
);

// 3. 根據ID獲取任務
server.tool("taskGetById",
    "根據ID獲取特定任務",
    { id: z.string() },
    async ({ id }) => {
        try {
            const task = await TaskManagerTool.getTaskById(id);

            if (!task) {
                return {
                    content: [{ type: "text", text: `未找到ID為 ${id} 的任務` }]
                };
            }

            return {
                content: [{ type: "text", text: `任務詳情：\n${JSON.stringify(task, null, 2)}` }]
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `獲取任務失敗: ${error instanceof Error ? error.message : "未知錯誤"}` }]
            };
        }
    }
);

// 4. 更新任務
server.tool("taskUpdate",
    "更新現有任務信息",
    {
        id: z.string(),
        updates: z.object({
            title: z.string().optional(),
            description: z.string().optional(),
            tags: z.array(z.string()).optional(),
            dueDate: z.string().optional(),
            priority: z.number().optional(),
            status: z.enum([
                TaskStatus.PENDING,
                TaskStatus.IN_PROGRESS,
                TaskStatus.COMPLETED,
                TaskStatus.CANCELLED
            ]).optional()
        })
    },
    async ({ id, updates }) => {
        try {
            const updatedTask = await TaskManagerTool.updateTask(id, updates);

            if (!updatedTask) {
                return {
                    content: [{ type: "text", text: `未找到ID為 ${id} 的任務` }]
                };
            }

            return {
                content: [{ type: "text", text: `任務更新成功：\n${JSON.stringify(updatedTask, null, 2)}` }]
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `更新任務失敗: ${error instanceof Error ? error.message : "未知錯誤"}` }]
            };
        }
    }
);

// 5. 刪除任務
server.tool("taskDelete",
    "刪除指定ID的任務",
    { id: z.string() },
    async ({ id }) => {
        try {
            const result = await TaskManagerTool.deleteTask(id);

            if (!result) {
                return {
                    content: [{ type: "text", text: `未找到ID為 ${id} 的任務` }]
                };
            }

            return {
                content: [{ type: "text", text: `任務已成功刪除` }]
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `刪除任務失敗: ${error instanceof Error ? error.message : "未知錯誤"}` }]
            };
        }
    }
);

// 6. 更新任務步驟
server.tool("taskStepUpdate",
    "更新任務的特定步驟",
    {
        taskId: z.string(),
        stepId: z.string(),
        updates: z.object({
            description: z.string().optional(),
            completed: z.boolean().optional(),
            order: z.number().optional(),
            estimatedTime: z.number().optional()
        })
    },
    async ({ taskId, stepId, updates }) => {
        try {
            const updatedTask = await TaskManagerTool.updateTaskStep(taskId, stepId, updates);

            if (!updatedTask) {
                return {
                    content: [{ type: "text", text: `未找到指定的任務或步驟` }]
                };
            }

            return {
                content: [{ type: "text", text: `步驟更新成功：\n${JSON.stringify(updatedTask, null, 2)}` }]
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `更新步驟失敗: ${error instanceof Error ? error.message : "未知錯誤"}` }]
            };
        }
    }
);

// 7. 添加任務步驟
server.tool("taskStepAdd",
    "為任務添加新步驟",
    {
        taskId: z.string(),
        description: z.string(),
        order: z.number().optional(),
        estimatedTime: z.number().optional()
    },
    async ({ taskId, description, order, estimatedTime }) => {
        try {
            const updatedTask = await TaskManagerTool.addTaskStep(taskId, description, order, estimatedTime);

            if (!updatedTask) {
                return {
                    content: [{ type: "text", text: `未找到ID為 ${taskId} 的任務` }]
                };
            }

            return {
                content: [{ type: "text", text: `步驟添加成功：\n${JSON.stringify(updatedTask, null, 2)}` }]
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `添加步驟失敗: ${error instanceof Error ? error.message : "未知錯誤"}` }]
            };
        }
    }
);

// 8. 刪除任務步驟
server.tool("taskStepDelete",
    "刪除任務的特定步驟",
    {
        taskId: z.string(),
        stepId: z.string()
    },
    async ({ taskId, stepId }) => {
        try {
            const updatedTask = await TaskManagerTool.deleteTaskStep(taskId, stepId);

            if (!updatedTask) {
                return {
                    content: [{ type: "text", text: `未找到指定的任務或步驟` }]
                };
            }

            return {
                content: [{ type: "text", text: `步驟刪除成功：\n${JSON.stringify(updatedTask, null, 2)}` }]
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `刪除步驟失敗: ${error instanceof Error ? error.message : "未知錯誤"}` }]
            };
        }
    }
);

// 9. 搜索任務
server.tool("taskSearch",
    "根據條件搜索任務",
    {
        filter: z.object({
            status: z.enum([
                TaskStatus.PENDING,
                TaskStatus.IN_PROGRESS,
                TaskStatus.COMPLETED,
                TaskStatus.CANCELLED
            ]).optional(),
            tags: z.array(z.string()).optional(),
            priority: z.number().optional(),
            dueDateFrom: z.string().optional(),
            dueDateTo: z.string().optional(),
            searchText: z.string().optional()
        })
    },
    async ({ filter }) => {
        try {
            const tasks = await TaskManagerTool.searchTasks(filter);

            return {
                content: [{ type: "text", text: `搜索到 ${tasks.length} 個任務：\n${JSON.stringify(tasks, null, 2)}` }]
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `搜索任務失敗: ${error instanceof Error ? error.message : "未知錯誤"}` }]
            };
        }
    }
);

// 10. 分析任務狀態
server.tool("taskAnalyze",
    "獲取任務狀態分析報告",
    {},
    async () => {
        try {
            const analysis = await TaskManagerTool.analyzeTaskStatus();

            return {
                content: [{ type: "text", text: `任務分析報告：\n${JSON.stringify(analysis, null, 2)}` }]
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `分析任務失敗: ${error instanceof Error ? error.message : "未知錯誤"}` }]
            };
        }
    }
);


// 11. 設定任務所有步驟的完成狀態
server.tool("taskSetAllSteps",
    "設定某個任務所有步驟的完成狀態",
    {
        taskId: z.string(),
        completed: z.boolean()
    },
    async ({ taskId, completed }) => {
        try {
            const updatedTask = await TaskManagerTool.setAllStepsStatus(taskId, completed);

            if (!updatedTask) {
                return {
                    content: [{ type: "text", text: `未找到ID為 ${taskId} 的任務` }]
                };
            }

            const status = completed ? '完成' : '未完成';
            return {
                content: [{ type: "text", text: `任務「${updatedTask.title}」的所有步驟已設為${status}狀態：\n${JSON.stringify(updatedTask, null, 2)}` }]
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `更新任務步驟狀態失敗: ${error instanceof Error ? error.message : "未知錯誤"}` }]
            };
        }
    }
);

// 12. 生成任務進度報告
server.tool("taskGenerateReport",
    "生成任務進度Markdown報告，可選擇日期篩選範圍",
    {
        outputPath: z.string().optional(),
        startDate: z.string().optional().describe("起始日期範圍 (YYYY-MM-DD 格式)"),
        endDate: z.string().optional().describe("結束日期範圍 (YYYY-MM-DD 格式)")
    },
    async ({ outputPath = "./task/TaskProgressReport.md", startDate, endDate }) => {
        try {
            // 根據是否有日期參數，使用對應的生成方法
            const report = await TaskReportGenerator.generateReportWithDateRange(outputPath, startDate, endDate);

            // 構建日期範圍的描述
            let dateRangeMsg = "";
            if (startDate && endDate) {
                dateRangeMsg = `從 ${startDate} 到 ${endDate} 期間的`;
            } else if (startDate) {
                dateRangeMsg = `從 ${startDate} 開始的`;
            } else if (endDate) {
                dateRangeMsg = `直到 ${endDate} 的`;
            }

            return {
                content: [{
                    type: "text",
                    text: `${dateRangeMsg}任務報告已生成並保存至：${outputPath}\n\n報告預覽：\n${report.substring(0, 500)}...\n\n(完整報告請查看生成的文件)`
                }]
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `生成任務報告失敗: ${error instanceof Error ? error.message : "未知錯誤"}` }]
            };
        }
    }
);


// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);