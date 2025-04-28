# MCP 伺服器工具集

[![smithery badge](https://smithery.ai/badge/@GonTwVn/GonMCPtool)](https://smithery.ai/server/@GonTwVn/GonMCPtool)

這是一個基於 Model Context Protocol 的伺服器工具集，提供多種功能來輔助開發和維護工作。

<a href="https://glama.ai/mcp/servers/@GonTwVn/GonMCPtool">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@GonTwVn/GonMCPtool/badge" alt="GonMCPtool MCP server" />
</a>

## 功能概覽

### 基本工具
- **add** - 簡單的加法計算工具
- **npmBuild** - 執行 npm build 命令構建專案
- **npmInstall** - 執行 npm install 命令安裝依賴

### 檔案操作工具
- **codeFileRead** - 讀取程式碼檔案並顯示行號
- **codeLineInsert** - 在程式碼檔案指定行插入內容
- **codeLineDelete** - 刪除程式碼檔案指定範圍的行
- **fileWrite** - 檔案寫入功能，提供建立、編輯與寫入功能
- **fileRead** - 讀取檔案內容，支援純文本和JSON格式
- **edit_file** - 對檔案進行精確的編輯，可以替換特定文字內容
- **insert_to_file** - 在檔案的特定位置插入新內容
- **delete_from_file** - 從檔案中刪除特定內容

### 搜尋工具
- **find_files** - 在允許的目錄中找尋符合檔名模式的檔案
- **search_code** - 在允許的目錄中搜尋包含特定文字的程式碼

### 本地化工具
- **localizationGetByKey** - 根據Key查詢特定翻譯項目
- **localizationSearch** - 搜尋包含特定文字的翻譯項目
- **localizationAdd** - 新增一個完整的翻譯項目
- **localizationUpdate** - 更新現有翻譯項目的內容
- **localizationDelete** - 刪除指定Key的翻譯項目
- **localizationExportJson** - 將特定語言的翻譯導出為JSON格式
- **localizationFindMissing** - 查找有Key值但缺少特定語言翻譯的項目
- **localizationFindLongValues** - 查找超過特定字數的翻譯項目

### 任務管理器工具
- **taskCreate** - 創建新的任務，可以包含多個步驟
- **taskGetAll** - 獲取所有任務列表
- **taskGetById** - 根據ID獲取特定任務
- **taskUpdate** - 更新現有任務信息
- **taskDelete** - 刪除指定ID的任務
- **taskStepUpdate** - 更新任務的特定步驟
- **taskStepAdd** - 為任務添加新步驟
- **taskStepDelete** - 刪除任務的特定步驟
- **taskSearch** - 根據條件搜索任務
- **taskAnalyze** - 獲取任務狀態分析報告
- **taskSetAllSteps** - 設定某個任務所有步驟的完成狀態
- **taskGenerateReport** - 生成任務進度Markdown報告
- **taskGuidanceRead** - 讀取AI任務指導文件
- **taskGuidanceWrite** - 寫入AI任務指導文件
- **taskStart** - 開始一個任務
- **taskComplete** - 完成一個任務


## 檔案操作工具詳細說明

### fileWrite
提供檔案寫入功能，可以創建新檔案或修改現有檔案。

```javascript
fileWrite({
  filePath: "path/to/file.txt",
  content: "This is the content",
  mode: "write", // 可選值: write, append, json
  createDirs: true, // 可選，是否自動創建目錄
  prettify: true // 可選，僅對json模式有效，是否美化JSON輸出
})
```

### fileRead
讀取檔案內容，支援純文本和JSON格式。

```javascript
fileRead({
  filePath: "path/to/file.txt",
  mode: "text", // 可選值: text, json
  encoding: "utf8" // 可選，指定編碼方式
})
```

### edit_file
對檔案進行精確的編輯，可以替換特定文字內容。

```javascript
edit_file({
  path: "path/to/file.txt",
  edits: [
    {
      oldText: "要替換的文字",
      newText: "替換後的文字"
    }
  ],
  dryRun: false // 可選，預覽變更而不實際修改檔案
})
```

### insert_to_file
在檔案的特定位置插入新內容。

```javascript
insert_to_file({
  path: "path/to/file.txt",
  position: 10, // 行號 (從1開始)，或標記文字
  content: "要插入的內容",
  dryRun: false // 可選，預覽變更而不實際修改檔案
})
```

### delete_from_file
從檔案中刪除特定內容。

```javascript
delete_from_file({
  path: "path/to/file.txt",
  selector: "要刪除的文字", // 或 {startLine: 5, endLine: 10} 或 {start: "開始標記", end: "結束標記"}
  dryRun: false // 可選，預覽變更而不實際修改檔案
})
```

## 使用範例

### 建立和編輯檔案

```javascript
// 創建一個新的 TypeScript 檔案
fileWrite({
  filePath: "src/utils/helper.ts",
  content: `export function add(a: number, b: number): number {
  return a + b;
}`,
  mode: "write"
});

// 讀取檔案內容
fileRead({
  filePath: "src/utils/helper.ts",
  mode: "text"
});

// 編輯檔案中的特定文字
edit_file({
  path: "src/utils/helper.ts",
  edits: [
    {
      oldText: "export function add",
      newText: "export function sum"
    }
  ]
});

// 在檔案中插入新內容
insert_to_file({
  path: "src/utils/helper.ts",
  position: 1, // 在第一行插入
  content: "// Math utility functions\n"
});

// 刪除檔案中的特定內容
delete_from_file({
  path: "src/utils/helper.ts",
  selector: "// Math utility functions\n"
});
```

### 使用 JSON 模式

```javascript
// 創建 JSON 配置檔案
fileWrite({
  filePath: "config.json",
  content: '{"version": "1.0.0", "debug": false}',
  mode: "json",
  prettify: true
});

// 讀取 JSON 檔案
fileRead({
  filePath: "config.json",
  mode: "json"
});
```

## 註意事項

1. `codeFileRead`、`codeLineInsert` 和 `codeLineDelete` 工具主要用於程式碼編輯，而新的檔案工具（`fileWrite`、`fileRead` 等）更為通用，可用於任何類型的文本檔案。

2. 使用 `edit_file`、`insert_to_file` 和 `delete_from_file` 工具時，建議先啟用 `dryRun` 模式來預覽變更，確保操作不會造成意外的修改。

3. 檔案路徑可以是相對路徑或絕對路徑。

4. 進行批次操作時，建議使用 `edit_file` 工具，可以在一次調用中進行多個編輯操作。