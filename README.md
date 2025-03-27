# GonMCPtool - My Model Context Protocol 工具集

GonMCPtool 是一個基於 TypeScript 開發的 Model Context Protocol (MCP) 工具集，我自己開發專案時常用的一些功能。

## 特點

- **代碼編輯工具**：透過簡單直觀的介面對程式碼檔案進行讀取、修改和刪除操作，主要讓 AI 可以針對特定行數進行修改，減少每次輸出的內容量。
- **本地化管理**：完整的多語言翻譯管理功能，支援新增、修改、刪除和查詢翻譯項目，支援 .csv 檔案格式的翻譯管理。
- **專案構建**：整合 npm 相關命令，提供便捷的專案構建和依賴安裝功能。
- **檔案和代碼搜尋**：強大的檔案搜尋和代碼內容搜尋功能，快速定位所需資源，便於直接在指定目錄中搜尋程式碼。
- **一個簡易的MCP工具架構模板**：簡易的專案模板，各位可以根據需求自己添加工具。

## 安裝

```bash
# 複製專案
git clone https://github.com/your-username/GonMCPtool.git

# 進入專案目錄
cd GonMCPtool

# 安裝依賴
npm install
```

## 使用方法

### 編譯專案

```bash
# 編譯 TypeScript 代碼
npm run build

# 執行專案
npm start
```

### 工具列表

GonMCPtool 提供以下主要工具：

#### 代碼管理工具

- `codeFileRead`：讀取程式碼檔案並顯示行號
- `codeLineInsert`：在程式碼檔案的指定行插入內容
- `codeLineDelete`：刪除程式碼檔案中的指定行範圍

#### 本地化工具

- `localizationGetByKey`：根據 Key 查詢特定翻譯項目
- `localizationSearch`：搜尋包含特定文字的翻譯項目
- `localizationAdd`：新增完整的翻譯項目
- `localizationUpdate`：更新現有翻譯項目的內容
- `localizationDelete`：刪除指定 Key 的翻譯項目
- `localizationExportJson`：將特定語言的翻譯導出為 JSON 格式
- `localizationFindMissing`：查找有 Key 值但缺少特定語言翻譯的項目
- `localizationFindLongValues`：查找超過特定字數的翻譯項目

#### 構建工具

- `npmBuild`：執行 npm build 命令構建專案
- `npmInstall`：執行 npm install 命令安裝依賴

#### 搜尋工具

- `find_files`：在允許的目錄中尋找所有符合檔名模式的檔案
- `search_code`：在允許的目錄中搜尋包含特定文字的程式碼

## API 示例

### 代碼編輯示例

```typescript
// 讀取程式碼檔案
await myFileReader.readFileWithLineNumbers('path/to/file.js');

// 插入代碼
await myFileInsert.insertAfterLine('path/to/file.py', 10, 'def new_method():', true);

// 刪除代碼
await myFileDelete.deleteLines('path/to/file.ts', 15, 20);
```

### 本地化示例

```typescript
// 新增翻譯項目
await LocalizationTool.addEntry('path/to/locale.json', {
  Key: 'welcome_message',
  'zh-TW': '歡迎使用',
  'zh-CN': '欢迎使用',
  'en': 'Welcome'
});

// 搜尋翻譯
await LocalizationTool.searchEntries('path/to/locale.json', '歡迎', 'zh-TW', 10);
```

## 專案結構

```
GonMCPtool/
├── dist/                   # 編譯後的 JavaScript 檔案
├── src/                    # 原始碼目錄
│   ├── main.ts             # 主程式入口
│   ├── tools/              # 工具實現
│   │   ├── codeSearchTool.ts
│   │   ├── csFileReader.ts   # myFileReader 實現
│   │   ├── csLineDeleter.ts  # myFileDelete 實現
│   │   ├── csLineInserter.ts # myFileInsert 實現
│   │   ├── fileSearchTool.ts
│   │   ├── localizationTool.ts
│   │   ├── localizationToolSimplified.ts
│   │   ├── npmBuildTool.ts
│   │   └── npmInstallTool.ts
├── .env                    # 環境變數配置
├── package.json            # npm 配置文件
└── README.md               # 說明文件
```

## 環境配置

如果需要，請在專案根目錄創建 `.env` 檔案，並設定必要的環境變數：

```
# 允許的目錄路徑，多個路徑使用逗號分隔
ALLOWED_DIRECTORIES=C:\path\to\project1,C:\path\to\project2

# 其他配置項...
```

## 核心功能詳解

### 檔案操作工具

- **myFileReader**：提供程式碼檔案讀取功能，並附加行號顯示，方便參考和後續編輯操作
- **myFileInsert**：針對程式碼檔案進行行級插入，支援自動匹配原始程式碼的縮排
- **myFileDelete**：針對程式碼檔案進行行級或範圍刪除，精確控制修改範圍

### 本地化管理功能

本專案提供全方位的多語言翻譯管理功能，支援：

- 多語言（中文繁體、中文簡體、英文等）翻譯項目的管理
- 翻譯條目的新增、修改、查詢與刪除
- 翻譯缺失檢查和長文本識別
- JSON 格式導出功能，便於與其他系統整合

### 代碼搜尋功能

- 支援基於檔名模式的檔案搜尋
- 支援基於內容的全文檢索
- 提供豐富的搜尋選項，如大小寫敏感度、排除目錄、最大結果數等

## 許可證

本專案採用 MIT 許可證，詳情請查看 [LICENSE](LICENSE) 檔案。

## 貢獻

歡迎提交 Pull Request 或建立 Issue 來幫助改進專案。您可以：

- 報告 Bug
- 提出新功能請求
- 提交代碼改進
- 完善文檔

## 聯絡方式

如有任何問題或建議，歡迎透過 GitHub Issues 與我聯繫。

感謝您使用 GonMCPtool！
