/**
 * AI 任務指導管理工具
 * 用於創建和管理 AI 任務指導文件，這些文件可以指導 AI 創建更精確的工單
 */

import fs from 'fs';
import path from 'path';
import { Task } from './interfaces/TaskManager.js';

export class AITaskGuidanceTool {
  private static GUIDANCE_DIR = './task';
  private static GUIDANCE_FILENAME_PREFIX = 'guidance_';

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
   * 創建任務指導文件
   * @param category 任務類別
   * @param content 指導內容
   * @returns 創建的文件路徑
   */
  public static createGuidance(category: string, content: string): string {
    this.ensureGuidanceDirectory();
    
    // 格式化類別名稱（移除空格，轉換為小寫）
    const formattedCategory = category.toLowerCase().replace(/\s+/g, '_');
    
    // 建立檔案名稱
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${this.GUIDANCE_FILENAME_PREFIX}${formattedCategory}_${timestamp}.txt`;
    
    // 建立完整路徑
    const filePath = path.join(path.resolve(this.GUIDANCE_DIR), filename);
    
    // 寫入內容
    fs.writeFileSync(filePath, content, 'utf-8');
    
    return filePath;
  }

  /**
   * 讀取特定類別的所有指導文件
   * @param category 任務類別，若為空則讀取所有指導
   * @returns 指導內容和檔案資訊的陣列
   */
  public static getGuidanceByCategory(category?: string): Array<{
    category: string;
    filename: string;
    content: string;
    createdAt: Date;
  }> {
    this.ensureGuidanceDirectory();
    
    const guidancePath = path.resolve(this.GUIDANCE_DIR);
    const files = fs.readdirSync(guidancePath);
    
    // 過濾指導文件
    const guidanceFiles = files.filter(file => 
      file.startsWith(this.GUIDANCE_FILENAME_PREFIX) && file.endsWith('.txt')
    );
    
    // 處理每個文件
    const result = guidanceFiles.map(filename => {
      // 從檔名解析類別
      const match = filename.match(new RegExp(`${this.GUIDANCE_FILENAME_PREFIX}(.*?)_\\d{4}-\\d{2}-\\d{2}T`));
      let fileCategory = match ? match[1] : 'unknown';
      fileCategory = fileCategory.replace(/_/g, ' ');
      
      // 如果有指定類別且不匹配，則跳過
      if (category && !fileCategory.includes(category.toLowerCase())) {
        return null;
      }
      
      // 讀取文件內容
      const filePath = path.join(guidancePath, filename);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // 從檔名解析創建時間
      const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
      const createdAtStr = dateMatch ? dateMatch[1].replace(/-/g, ':').replace('T', ' ') : '';
      const createdAt = createdAtStr ? new Date(createdAtStr) : new Date();
      
      return {
        category: fileCategory,
        filename,
        content,
        createdAt
      };
    }).filter(item => item !== null) as Array<{
      category: string;
      filename: string;
      content: string;
      createdAt: Date;
    }>;
    
    // 按創建時間排序，最新的在前
    return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * 刪除指導文件
   * @param filename 文件名
   * @returns 是否刪除成功
   */
  public static deleteGuidance(filename: string): boolean {
    this.ensureGuidanceDirectory();
    
    // 安全檢查：確保只刪除指導文件
    if (!filename.startsWith(this.GUIDANCE_FILENAME_PREFIX) || !filename.endsWith('.txt')) {
      throw new Error('無效的指導文件名稱');
    }
    
    const filePath = path.join(path.resolve(this.GUIDANCE_DIR), filename);
    
    // 檢查文件是否存在
    if (!fs.existsSync(filePath)) {
      return false;
    }
    
    // 刪除文件
    fs.unlinkSync(filePath);
    return true;
  }

  /**
   * 更新指導文件內容
   * @param filename 文件名
   * @param newContent 新內容
   * @returns 是否更新成功
   */
  public static updateGuidance(filename: string, newContent: string): boolean {
    this.ensureGuidanceDirectory();
    
    // 安全檢查：確保只更新指導文件
    if (!filename.startsWith(this.GUIDANCE_FILENAME_PREFIX) || !filename.endsWith('.txt')) {
      throw new Error('無效的指導文件名稱');
    }
    
    const filePath = path.join(path.resolve(this.GUIDANCE_DIR), filename);
    
    // 檢查文件是否存在
    if (!fs.existsSync(filePath)) {
      return false;
    }
    
    // 更新文件內容
    fs.writeFileSync(filePath, newContent, 'utf-8');
    return true;
  }

  /**
   * 基於項目歷史任務生成新的指導建議
   * @param completedTasks 已完成的任務列表
   * @param category 任務類別
   * @returns 生成的指導內容
   */
  public static generateGuidanceSuggestion(completedTasks: Task[], category?: string): string {
    if (completedTasks.length === 0) {
      return '目前沒有已完成的任務數據可供分析。';
    }
    
    // 過濾特定類別的任務
    let filteredTasks = completedTasks;
    if (category) {
      filteredTasks = completedTasks.filter(task => 
        task.tags.some(tag => tag.toLowerCase().includes(category.toLowerCase()))
      );
      
      if (filteredTasks.length === 0) {
        return `沒有找到與「${category}」相關的已完成任務。`;
      }
    }
    
    // 收集任務的常見模式和特點
    const commonTags = this.getCommonTags(filteredTasks);
    const commonStepPatterns = this.analyzeStepPatterns(filteredTasks);
    const complexityPatterns = this.analyzeTaskComplexity(filteredTasks);
    
    // 生成指導內容
    let guidance = `# AI 任務指導：${category || '所有類別'}\n\n`;
    guidance += `## 生成於：${new Date().toISOString()}\n\n`;
    guidance += `## 分析基於：${filteredTasks.length} 個已完成任務\n\n`;
    
    // 添加常用標籤建議
    guidance += `## 建議標籤\n\n`;
    guidance += `以下是此類任務常用的標籤：\n\n`;
    commonTags.forEach(tag => {
      guidance += `- ${tag.name} (使用頻率: ${tag.count} 次)\n`;
    });
    guidance += `\n`;
    
    // 添加任務步驟模式建議
    guidance += `## 任務步驟建議\n\n`;
    guidance += `此類任務通常包含以下步驟：\n\n`;
    commonStepPatterns.forEach((pattern, index) => {
      guidance += `${index + 1}. ${pattern.pattern} (出現於 ${pattern.frequency.toFixed(1)}% 的任務中)\n`;
    });
    guidance += `\n`;
    
    // 添加任務複雜度分析
    guidance += `## 任務複雜度分析\n\n`;
    guidance += `- 平均步驟數：${complexityPatterns.avgSteps.toFixed(1)}\n`;
    guidance += `- 最小步驟數：${complexityPatterns.minSteps}\n`;
    guidance += `- 最大步驟數：${complexityPatterns.maxSteps}\n`;
    guidance += `- 平均預計完成時間：${complexityPatterns.avgEstimatedTime.toFixed(1)} 分鐘\n\n`;
    
    // 添加常見錯誤和提示
    guidance += `## 潛在風險和注意事項\n\n`;
    const completionRateIssues = this.identifyCompletionRateIssues(filteredTasks);
    if (completionRateIssues.length > 0) {
      guidance += `以下步驟在過去的任務中完成率較低，可能需要更詳細的說明或更多時間：\n\n`;
      completionRateIssues.forEach(issue => {
        guidance += `- "${issue.pattern}" - 完成率僅 ${issue.completionRate.toFixed(1)}%\n`;
      });
    } else {
      guidance += `在分析的任務中沒有發現明顯的完成率問題。\n`;
    }
    guidance += `\n`;
    
    // 添加成功案例參考
    guidance += `## 成功案例參考\n\n`;
    const mostSuccessfulTask = this.findMostSuccessfulTask(filteredTasks);
    if (mostSuccessfulTask) {
      guidance += `### 最成功案例：${mostSuccessfulTask.title}\n\n`;
      guidance += `- 描述：${mostSuccessfulTask.description}\n`;
      guidance += `- 標籤：${mostSuccessfulTask.tags.join(', ')}\n`;
      guidance += `- 步驟：\n`;
      mostSuccessfulTask.steps.forEach(step => {
        guidance += `  - ${step.description}\n`;
      });
    }
    guidance += `\n`;
    
    // 添加最終建議
    guidance += `## 建議摘要\n\n`;
    guidance += `創建 ${category || ''} 相關任務時：\n\n`;
    guidance += `1. 確保包含必要的標籤：${commonTags.slice(0, 3).map(t => t.name).join(', ')}\n`;
    guidance += `2. 建議步驟數量：${Math.round(complexityPatterns.avgSteps)} 個左右\n`;
    guidance += `3. 合理預估時間：${Math.round(complexityPatterns.avgEstimatedTime)} 分鐘左右\n`;
    
    return guidance;
  }

  /**
   * 獲取任務中最常見的標籤
   */
  private static getCommonTags(tasks: Task[]): Array<{name: string, count: number}> {
    const tagCounts: Record<string, number> = {};
    
    tasks.forEach(task => {
      task.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    
    return Object.entries(tagCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * 分析任務步驟的常見模式
   */
  private static analyzeStepPatterns(tasks: Task[]): Array<{pattern: string, frequency: number}> {
    const stepPatterns: Record<string, number> = {};
    
    tasks.forEach(task => {
      task.steps.forEach(step => {
        const pattern = step.description.toLowerCase();
        stepPatterns[pattern] = (stepPatterns[pattern] || 0) + 1;
      });
    });
    
    const totalTasks = tasks.length;
    return Object.entries(stepPatterns)
      .map(([pattern, count]) => ({ 
        pattern, 
        frequency: (count / totalTasks) * 100
      }))
      .filter(item => item.frequency >= 20) // 只保留出現頻率超過20%的模式
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * 分析任務複雜度
   */
  private static analyzeTaskComplexity(tasks: Task[]): {
    avgSteps: number;
    minSteps: number;
    maxSteps: number;
    avgEstimatedTime: number;
  } {
    const stepCounts = tasks.map(task => task.steps.length);
    const estimatedTimes = tasks.map(task => 
      task.steps.reduce((sum, step) => sum + (step.estimatedTime || 0), 0)
    );
    
    return {
      avgSteps: this.average(stepCounts),
      minSteps: Math.min(...stepCounts),
      maxSteps: Math.max(...stepCounts),
      avgEstimatedTime: this.average(estimatedTimes)
    };
  }

  /**
   * 識別完成率較低的步驟模式
   */
  private static identifyCompletionRateIssues(tasks: Task[]): Array<{
    pattern: string;
    completionRate: number;
  }> {
    const stepCompletionRates: Record<string, {completed: number, total: number}> = {};
    
    tasks.forEach(task => {
      task.steps.forEach(step => {
        const pattern = step.description.toLowerCase();
        if (!stepCompletionRates[pattern]) {
          stepCompletionRates[pattern] = { completed: 0, total: 0 };
        }
        
        stepCompletionRates[pattern].total += 1;
        if (step.completed) {
          stepCompletionRates[pattern].completed += 1;
        }
      });
    });
    
    return Object.entries(stepCompletionRates)
      .map(([pattern, stats]) => ({
        pattern,
        completionRate: (stats.completed / stats.total) * 100
      }))
      .filter(item => item.completionRate < 70 && item.pattern.length > 5) // 只關注完成率低於70%的有意義步驟
      .sort((a, b) => a.completionRate - b.completionRate);
  }

  /**
   * 找出最成功的任務案例
   */
  private static findMostSuccessfulTask(tasks: Task[]): Task | null {
    if (tasks.length === 0) return null;
    
    // 這裡的標準可以根據需求調整，例如：
    // - 完成時間最短的任務
    // - 步驟最完整的任務
    // - 標籤最多的任務
    
    // 例如，找出預計時間與實際時間差異最小的任務
    let bestTask = tasks[0];
    let smallestTimeDifference = Number.MAX_VALUE;
    
    tasks.forEach(task => {
      const stepsWithEstTime = task.steps.filter(step => step.estimatedTime !== undefined);
      if (stepsWithEstTime.length > 0) {
        const totalEstTime = stepsWithEstTime.reduce((sum, step) => sum + (step.estimatedTime || 0), 0);
        const createdDate = new Date(task.createdAt);
        const completedDate = new Date(task.updatedAt);
        const actualTime = (completedDate.getTime() - createdDate.getTime()) / (1000 * 60); // 分鐘
        
        const timeDifference = Math.abs(actualTime - totalEstTime);
        if (timeDifference < smallestTimeDifference) {
          smallestTimeDifference = timeDifference;
          bestTask = task;
        }
      }
    });
    
    return bestTask;
  }

  /**
   * 計算數字陣列的平均值
   */
  private static average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }
}
