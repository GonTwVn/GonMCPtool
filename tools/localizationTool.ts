import fs from 'fs/promises';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

/**
 * CSV 檔案結構
 */
export interface LocalizationEntry {
  Key: string;
  'zh-TW': string;
  'zh-CN': string;
  en: string;
  [key: string]: string; // 其他可能的語言欄位
}

/**
 * 搜尋結果
 */
export interface SearchResult {
  totalResults: number;
  entries: LocalizationEntry[];
}

/**
 * 超長文字結果
 */
export interface LongValueResult {
  totalResults: number;
  entries: Array<{
    key: string;
    language: string;
    value: string;
    length: number;
  }>;
}

/**
 * Unity多國語系CSV檔案處理工具 - 進階實現
 * 支持部分CRUD操作，使用緩存系統避免重複讀取檔案
 */
export class LocalizationTool {
  // 用於檔案緩存
  private static cache = new Map<string, {
    data: LocalizationEntry[],
    timestamp: number
  }>();

  // 緩存過期時間（毫秒）
  private static CACHE_EXPIRY = 30000; // 30秒

  /**
   * 讀取CSV檔案的原始內容
   * @param filePath CSV檔案路徑
   * @returns 檔案原始內容
   */
  private static async readCSVFileRaw(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      console.error(`讀取CSV檔案失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
      throw new Error(`無法讀取檔案 ${filePath}: ${error}`);
    }
  }

  /**
   * 直接解析CSV內容為本地化項目
   * 使用更穩健的解析策略處理非標準CSV
   * @param content CSV檔案內容
   * @returns 解析後的本地化項目陣列
   */
  private static parseCSVContent(content: string): LocalizationEntry[] {
    try {
      // 首先嘗試正常解析，大多數情況下這應該能工作
      return parse(content, {
        columns: true,
        skip_empty_lines: true,
        relaxColumnCount: true,
        relaxQuotes: true,
        escape: '\\',
        trim: true
      }) as LocalizationEntry[];
    } catch (error) {
      console.warn(`標準CSV解析失敗，嘗試手動解析: ${error}`);
      
      // 手動解析CSV
      return this.manualParseCSV(content);
    }
  }

  /**
   * 手動解析CSV內容，當標準解析失敗時使用
   * @param content CSV內容
   * @returns 解析後的本地化項目陣列
   */
  private static manualParseCSV(content: string): LocalizationEntry[] {
    // 標準化換行符
    const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalizedContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) { // 至少需要標題行和一行數據
      return [];
    }
    
    // 解析標題行
    const headers = this.parseCSVRow(lines[0]);
    
    if (!headers.includes('Key')) {
      throw new Error('CSV檔案缺少必要的Key欄位');
    }
    
    const entries: LocalizationEntry[] = [];
    
    // 解析數據行
    for (let i = 1; i < lines.length; i++) {
      try {
        const row = this.parseCSVRow(lines[i]);
        const entry: Record<string, string> = {};
        
        // 將每個欄位值與標題對應
        for (let j = 0; j < headers.length; j++) {
          entry[headers[j]] = j < row.length ? row[j] : '';
        }
        
        // 確保至少有Key
        if (entry.Key) {
          entries.push(entry as LocalizationEntry);
        }
      } catch (e) {
        console.warn(`解析第 ${i+1} 行時出錯，已跳過: ${e}`);
      }
    }
    
    return entries;
  }

  /**
   * 解析單行CSV數據
   * @param line CSV行
   * @returns 欄位值陣列
   */
  private static parseCSVRow(line: string): string[] {
    const row: string[] = [];
    let inQuotes = false;
    let currentValue = '';
    
    for (let i = 0; i < line.length; i++) {
      const char = line.charAt(i);
      const nextChar = i < line.length - 1 ? line.charAt(i + 1) : '';
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // 處理轉義的引號 (兩個連續的引號)
          currentValue += '"';
          i++; // 跳過下一個引號
        } else {
          // 切換引號狀態
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // 欄位分隔符，但不在引號內
        row.push(currentValue);
        currentValue = '';
      } else {
        // 普通字符
        currentValue += char;
      }
    }
    
    // 添加最後一個欄位
    row.push(currentValue);
    
    return row;
  }

  /**
   * 從檔案緩存或直接讀取CSV資料
   * @param filePath CSV檔案路徑
   * @param force 是否強制重新讀取
   */
  private static async getCSVData(filePath: string, force = false): Promise<LocalizationEntry[]> {
    const now = Date.now();
    const cached = this.cache.get(filePath);

    // 如果緩存有效且不需要強制重新讀取
    if (!force && cached && (now - cached.timestamp < this.CACHE_EXPIRY)) {
      return cached.data;
    }

    try {
      // 讀取並解析CSV檔案
      const content = await this.readCSVFileRaw(filePath);
      const records = this.parseCSVContent(content);
      
      // 更新緩存
      this.cache.set(filePath, {
        data: records,
        timestamp: now
      });
      
      return records;
    } catch (error) {
      console.error(`解析CSV檔案失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
      throw error;
    }
  }

  /**
   * 寫入CSV資料到檔案並更新緩存
   * @param filePath CSV檔案路徑
   * @param data 要寫入的資料
   */
  private static async writeCSVData(filePath: string, data: LocalizationEntry[]): Promise<void> {
    try {
      // 檢查是否有數據
      if (data.length === 0) {
        throw new Error('沒有要寫入的數據');
      }
      
      // 獲取所有列名
      const columnSet = new Set<string>();
      columnSet.add('Key'); // 確保Key始終是第一列
      
      // 收集所有可能的列
      data.forEach(entry => {
        Object.keys(entry).forEach(key => columnSet.add(key));
      });
      
      // 轉換為陣列並將Key移到第一位
      const columns = Array.from(columnSet);
      if (columns[0] !== 'Key') {
        const keyIndex = columns.indexOf('Key');
        if (keyIndex > 0) {
          columns.splice(keyIndex, 1);
          columns.unshift('Key');
        }
      }
      
      // 使用csv-stringify生成CSV內容
      const output = stringify(data, {
        header: true,
        columns,
        quoted_string: true,
        quoted_empty: true
      });
      
      // 寫入檔案
      await fs.writeFile(filePath, output, 'utf-8');
      
      // 更新緩存
      this.cache.set(filePath, {
        data: [...data], // 深拷貝防止引用問題
        timestamp: Date.now()
      });
    } catch (error) {
      console.error(`寫入CSV檔案失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
      throw error;
    }
  }

  /**
   * 清除檔案緩存
   * @param filePath 特定檔案路徑，如果不提供則清除所有緩存
   */
  static clearCache(filePath?: string): void {
    if (filePath) {
      this.cache.delete(filePath);
    } else {
      this.cache.clear();
    }
  }

  /**
   * 讀取特定Key的翻譯項目
   * @param filePath CSV檔案路徑
   * @param key 要查詢的Key
   * @returns 找到的翻譯項目，若不存在則返回null
   */
  static async getEntryByKey(filePath: string, key: string): Promise<LocalizationEntry | null> {
    try {
      // 讀取所有資料
      const records = await this.getCSVData(filePath);
      
      // 尋找匹配的Key
      const foundEntry = records.find(entry => entry.Key === key);
      return foundEntry || null;
    } catch (error) {
      console.error(`讀取Key失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
      throw error;
    }
  }

  /**
   * 搜尋包含特定文字的翻譯項目
   * @param filePath CSV檔案路徑
   * @param searchText 要搜尋的文字
   * @param language 限定搜尋的語言，例如 'zh-TW'，若為空則搜尋所有語言
   * @param limit 最大返回結果數量
   * @returns 符合條件的翻譯項目陣列
   */
  static async searchEntries(
    filePath: string,
    searchText: string,
    language: string = '',
    limit: number = 10
  ): Promise<SearchResult> {
    try {
      const records = await this.getCSVData(filePath);
      const searchTextLower = searchText.toLowerCase();

      // 搜尋邏輯
      let results: LocalizationEntry[] = [];

      if (language) {
        // 僅搜尋指定語言
        results = records.filter(entry =>
          entry[language] && entry[language].toLowerCase().includes(searchTextLower)
        );
      } else {
        // 搜尋所有欄位
        results = records.filter(entry =>
          Object.entries(entry).some(([key, value]) => 
            key !== 'Key' && value && value.toLowerCase().includes(searchTextLower)
          )
        );
      }

      // 限制返回數量
      const limitedResults = results.slice(0, limit);

      return {
        totalResults: results.length,
        entries: limitedResults
      };
    } catch (error) {
      console.error(`搜尋文字失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
      throw error;
    }
  }

  /**
   * 新增翻譯項目
   * @param filePath CSV檔案路徑
   * @param entry 要新增的翻譯項目
   * @returns 成功或失敗訊息
   */
  static async addEntry(filePath: string, entry: LocalizationEntry): Promise<string> {
    try {
      // 檢查輸入是否有效
      if (!entry.Key) {
        return '錯誤: Key 不能為空';
      }
      
      const records = await this.getCSVData(filePath);

      // 檢查Key是否已存在
      if (records.some(e => e.Key === entry.Key)) {
        return `錯誤: Key "${entry.Key}" 已存在`;
      }

      // 新增項目
      records.push({...entry});

      // 寫回檔案並更新緩存
      await this.writeCSVData(filePath, records);

      return `成功新增Key "${entry.Key}"`;
    } catch (error) {
      console.error(`新增翻譯項失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
      throw error;
    }
  }

  /**
   * 更新翻譯項目
   * @param filePath CSV檔案路徑
   * @param key 要更新的Key
   * @param updateData 更新的數據，可以是部分欄位
   * @returns 成功或失敗訊息
   */
  static async updateEntry(
    filePath: string,
    key: string,
    updateData: Partial<Omit<LocalizationEntry, 'Key'>>
  ): Promise<string> {
    try {
      const records = await this.getCSVData(filePath);

      // 找到要更新的項目索引
      const index = records.findIndex(entry => entry.Key === key);
      if (index === -1) {
        return `錯誤: Key "${key}" 不存在`;
      }

      // 更新欄位 (確保過濾掉任何undefined值)
      const validUpdateData = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== undefined)
      ) as Record<string, string>;
      
      records[index] = {
        ...records[index],
        ...validUpdateData
      };

      // 寫回檔案並更新緩存
      await this.writeCSVData(filePath, records);

      return `成功更新Key "${key}"`;
    } catch (error) {
      console.error(`更新翻譯項失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
      throw error;
    }
  }

  /**
   * 刪除翻譯項目
   * @param filePath CSV檔案路徑
   * @param key 要刪除的Key
   * @returns 成功或失敗訊息
   */
  static async deleteEntry(filePath: string, key: string): Promise<string> {
    try {
      const records = await this.getCSVData(filePath);

      // 找到要刪除的項目索引
      const index = records.findIndex(entry => entry.Key === key);
      if (index === -1) {
        return `錯誤: Key "${key}" 不存在`;
      }

      // 刪除項目
      records.splice(index, 1);

      // 寫回檔案並更新緩存
      await this.writeCSVData(filePath, records);

      return `成功刪除Key "${key}"`;
    } catch (error) {
      console.error(`刪除翻譯項失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
      throw error;
    }
  }

  /**
   * 匯出特定語言的翻譯資料為JSON格式
   * @param filePath CSV檔案路徑
   * @param language 要匯出的語言，例如 'zh-TW'
   * @returns JSON字串或失敗訊息
   */
  static async exportLanguageAsJson(filePath: string, language: string): Promise<string> {
    try {
      const records = await this.getCSVData(filePath);

      // 創建Key-Value的映射
      const langData: Record<string, string> = {};

      for (const entry of records) {
        if (entry.Key && entry[language]) {
          langData[entry.Key] = entry[language];
        }
      }

      return JSON.stringify(langData, null, 2);
    } catch (error) {
      console.error(`匯出語言資料失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
      throw error;
    }
  }

  /**
   * 從本地文件直接讀取目標Key的值
   * 當標準解析方法失敗時使用，直接通過文本搜索查找Key
   * @param filePath CSV檔案路徑
   * @param key 要查詢的Key
   * @returns 找到的翻譯項目，若不存在則返回null
   */
  static async getEntryByKeyDirect(filePath: string, key: string): Promise<LocalizationEntry | null> {
    try {
      // 直接讀取檔案內容
      const content = await this.readCSVFileRaw(filePath);
      const lines = content.split(/\r?\n/);
      
      if (lines.length < 2) {
        return null;
      }
      
      // 解析標題行
      const headers = this.parseCSVRow(lines[0]);
      
      // 尋找包含該Key的行
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // 嘗試解析該行
        const values = this.parseCSVRow(line);
        
        // 檢查第一個值是否與Key匹配
        if (values[0] === key) {
          // 構建結果對象
          const result: Record<string, string> = {};
          
          for (let j = 0; j < headers.length; j++) {
            result[headers[j]] = j < values.length ? values[j] : '';
          }
          
          return result as LocalizationEntry;
        }
      }
      
      return null;
    } catch (error) {
      console.error(`直接讀取Key失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
      throw error;
    }
  }

  /**
   * 搜尋有Key值但某語言翻譯為空的項目
   * @param filePath CSV檔案路徑
   * @param language 要檢查的語言，例如 'zh-TW'、'zh-CN'、'en' 等
   * @param limit 最大返回結果數量
   * @returns 缺少指定語言翻譯的項目列表
   */
  static async findMissingTranslations(filePath: string, language: string, limit: number = 50): Promise<SearchResult> {
    try {
      if (!language) {
        throw new Error('必須指定要檢查的語言');
      }

      const records = await this.getCSVData(filePath);
      
      // 尋找指定語言翻譯為空的項目
      const missingEntries = records.filter(entry => {
        // 確保有Key且該語言的翻譯為空
        return entry.Key && 
               (entry[language] === undefined || 
                entry[language] === null || 
                entry[language].trim() === '');
      });

      // 限制返回數量
      const limitedResults = missingEntries.slice(0, limit);

      return {
        totalResults: missingEntries.length,
        entries: limitedResults
      };
    } catch (error) {
      console.error(`搜尋缺少翻譯的項目失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
      throw error;
    }
  }

  /**
   * 查找字數超過指定長度的翻譯項目
   * @param filePath CSV檔案路徑
   * @param threshold 字數閾值
   * @param language 要檢查的語言，如不指定則檢查所有語言
   * @param limit 最大返回結果數量
   * @returns 超過字數閾值的項目列表
   */
  static async findLongValues(
    filePath: string, 
    threshold: number, 
    language: string = '', 
    limit: number = 50
  ): Promise<LongValueResult> {
    try {
      if (threshold <= 0) {
        throw new Error('字數閾值必須大於0');
      }

      const records = await this.getCSVData(filePath);
      
      // 用於存儲結果的陣列
      const longValues: Array<{
        key: string;
        language: string;
        value: string;
        length: number;
      }> = [];

      // 遍歷所有記錄
      for (const entry of records) {
        if (!entry.Key) continue;

        // 取得要檢查的語言欄位
        const languagesToCheck = language 
          ? [language] 
          : Object.keys(entry).filter(key => key !== 'Key');

        // 檢查每個語言欄位
        for (const lang of languagesToCheck) {
          if (entry[lang] && entry[lang].length > threshold) {
            longValues.push({
              key: entry.Key,
              language: lang,
              value: entry[lang],
              length: entry[lang].length
            });
          }
        }
      }

      // 依長度降序排序
      longValues.sort((a, b) => b.length - a.length);

      // 限制返回數量
      const limitedResults = longValues.slice(0, limit);

      return {
        totalResults: longValues.length,
        entries: limitedResults
      };
    } catch (error) {
      console.error(`搜尋長文字失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
      throw error;
    }
  }
}
