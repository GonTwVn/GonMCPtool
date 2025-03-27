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
 * Unity多國語系CSV檔案處理工具 - 簡化版
 * 支持部分CRUD操作，無需每次都讀取整個檔案
 */
export class LocalizationTool {
  /**
   * 讀取特定Key的翻譯項目
   * @param filePath CSV檔案路徑
   * @param key 要查詢的Key
   * @returns 找到的翻譯項目，若不存在則返回null
   */
  static async getEntryByKey(filePath: string, key: string): Promise<LocalizationEntry | null> {
    try {
      // 讀取CSV檔案
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true
      }) as LocalizationEntry[];

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
      // 讀取CSV檔案
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true
      }) as LocalizationEntry[];

      // 搜尋邏輯
      let results: LocalizationEntry[] = [];
      
      if (language) {
        // 僅搜尋指定語言
        results = records.filter(entry => 
          entry[language] && entry[language].toLowerCase().includes(searchText.toLowerCase())
        );
      } else {
        // 搜尋所有欄位
        results = records.filter(entry => 
          Object.values(entry).some(value => 
            value && value.toLowerCase().includes(searchText.toLowerCase())
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
   * 新增或更新翻譯項目的簡單版本
   * @param filePath CSV檔案路徑
   * @param entry 要新增的翻譯項目
   * @returns 成功或失敗訊息
   */
  static async saveEntry(filePath: string, entry: LocalizationEntry): Promise<string> {
    try {
      // 讀取現有CSV檔案
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true
      }) as LocalizationEntry[];
      
      // 檢查Key是否已存在
      const index = records.findIndex(e => e.Key === entry.Key);
      if (index !== -1) {
        // 更新現有項目
        records[index] = { ...records[index], ...entry };
      } else {
        // 新增項目
        records.push(entry);
      }
      
      // 寫回檔案
      const columns = Object.keys(records[0]);
      const output = stringify(records, { header: true, columns });
      await fs.writeFile(filePath, output, 'utf-8');
      
      return index !== -1 
        ? `成功更新Key "${entry.Key}"`
        : `成功新增Key "${entry.Key}"`;
    } catch (error) {
      console.error(`保存翻譯項失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
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
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true
      }) as LocalizationEntry[];
      
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
}
