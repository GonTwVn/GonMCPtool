/**
 * AI 任務指導生成工具
 * 用於在 AI 分析完報告後，根據當前項目狀態生成對下次任務創建的指導建議
 */

import fs from 'fs';
import path from 'path';
import { Task, TaskStatus } from './interfaces/TaskManager.js';
import { TaskManagerTool } from './taskManagerTool.js';

export class AITaskGuidanceGenerator {
  private static GUIDANCE_DIR = './task';
  private static GUIDANCE_FILENAME_PREFIX = 'ai_guidance_';

  /**
   * 確保指導目錄存在
   */
  private static ensureGuidanceDirectory(): void {
    const guidancePath = path.resolve(this.GUIDANCE_DIR);
    if (!fs.existsSync(guidancePath)) {
      fs.mkdirSync(guidancePath, { recursive: true });
    }
  }

  /**
   * 生成並保存 AI 對下次任務的指導建議
   * @param analysisResult 任務分析結果
   * @param aiThoughts AI 對報告的思考和見解
   * @returns 生成的文件路徑
   */
  public static saveGuidance(
    aiThoughts: string, 
    category?: string
  ): string {
    this.ensureGuidanceDirectory();
    
    // 格式化類別名稱（如果提供了類別）
    const categoryPart = category ? `_${category.toLowerCase().replace(/\s+/g, '_')}` : '';
    
    // 建立檔案名稱
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${this.GUIDANCE_FILENAME_PREFIX}${timestamp}${categoryPart}.txt`;
    
    // 建立完整路徑
    const filePath = path.join(path.resolve(this.GUIDANCE_DIR), filename);
    
    // 寫入內容
    fs.writeFileSync(filePath, aiThoughts, 'utf-8');
    
    return filePath;
  }

  /**
   * 獲取最新的 AI 指導建議
   * @param limit 返回的數量限制
   * @returns 最新的指導建議列表
   */
  public static getRecentGuidance(limit: number = 5): Array<{
    filename: string;
    content: string;
    createdAt: Date;
    category?: string;
  }> {
    this.ensureGuidanceDirectory();
    
    const guidancePath = path.resolve(this.GUIDANCE_DIR);
    const files = fs.readdirSync(guidancePath);
    
    // 過濾 AI 指導文件
    const guidanceFiles = files.filter(file => 
      file.startsWith(this.GUIDANCE_FILENAME_PREFIX) && file.endsWith('.txt')
    );
    
    // 處理每個文件
    const result = guidanceFiles.map(filename => {
      // 從檔名解析類別
      const categoryMatch = filename.match(new RegExp(`${this.GUIDANCE_FILENAME_PREFIX}\\d{4}-\\d{2}-\\d{2}T.*?_(.+?)\\.txt`));
      const category = categoryMatch ? categoryMatch[1].replace(/_/g, ' ') : undefined;
      
      // 讀取文件內容
      const filePath = path.join(guidancePath, filename);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // 從檔名解析創建時間
      const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
      const createdAtStr = dateMatch ? dateMatch[1].replace(/-/g, ':').replace('T', ' ') : '';
      const createdAt = createdAtStr ? new Date(createdAtStr) : new Date();
      
      return {
        filename,
        content,
        createdAt,
        category
      };
    });
    
    // 按創建時間排序，最新的在前
    return result
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * 準備任務分析數據，提供給 AI 參考並生成指導
   * @returns 任務數據摘要和待改進項目
   */
  public static async prepareTaskAnalysisData(): Promise<{
    summary: string;
    pendingTasks: Task[];
    completedTasks: Task[];
    categories: string[];
    recommendedFocus: string[];
  }> {
    // 獲取所有任務
    const tasks = await TaskManagerTool.getAllTasks();
    
    // 分類任務
    const pendingTasks = tasks.filter(t => t.status === TaskStatus.PENDING || t.status === TaskStatus.IN_PROGRESS);
    const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED);
    
    // 收集所有任務標籤作為類別
    const allTags = new Set<string>();
    tasks.forEach(task => {
      task.tags.forEach(tag => allTags.add(tag));
    });
    const categories = Array.from(allTags);
    
    // 基於現有任務狀態，建議下一步重點關注的領域
    const recommendedFocus = this.identifyRecommendedFocus(tasks);
    
    // 生成任務摘要
    const summary = `
項目狀態摘要:
- 總任務數: ${tasks.length}
- 已完成任務: ${completedTasks.length}
- 待處理/進行中任務: ${pendingTasks.length}
- 任務類別: ${categories.join(', ')}
    `;
    
    return {
      summary,
      pendingTasks,
      completedTasks,
      categories,
      recommendedFocus
    };
  }

  /**
   * 識別推薦重點關注的領域
   * @param tasks 所有任務
   * @returns 推薦關注的領域列表
   */
  private static identifyRecommendedFocus(tasks: Task[]): string[] {
    // 先只給出基於標籤的建議
    const tagFrequency: Record<string, number> = {};
    const pendingTagFrequency: Record<string, number> = {};
    
    // 統計所有標籤出現頻率
    tasks.forEach(task => {
      task.tags.forEach(tag => {
        tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
        
        // 特別統計待處理任務的標籤
        if (task.status === TaskStatus.PENDING || task.status === TaskStatus.IN_PROGRESS) {
          pendingTagFrequency[tag] = (pendingTagFrequency[tag] || 0) + 1;
        }
      });
    });
    
    // 找出最常見的標籤以及待處理任務中最常見的標籤
    const commonTags = Object.entries(tagFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tag]) => tag);
    
    const commonPendingTags = Object.entries(pendingTagFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([tag]) => tag);
    
    // 合併兩個列表，去重
    return [...new Set([...commonPendingTags, ...commonTags])];
  }
}
