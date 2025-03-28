/**
 * 任務報告生成器
 * 生成任務進度的 Markdown 格式報告
 */

import fs from 'fs';
import path from 'path';
import { TaskManagerTool } from './taskManagerTool.js';
import { Task, TaskStatus } from './interfaces/TaskManager.js';

export class TaskReportGenerator {
  /**
   * 生成任務報告並保存為 Markdown 文件
   * @param outputPath 輸出文件路徑
   * @returns 生成的報告內容
   */
  public static async generateReport(outputPath: string): Promise<string> {
    // 調用帶日期範圍的報告生成函數，但不提供日期範圍
    return this.generateReportWithDateRange(outputPath);
  }

  /**
   * 生成具有日期篩選功能的任務報告並保存為 Markdown 文件
   * @param outputPath 輸出文件路徑
   * @param startDate 可選的報告起始日期 (YYYY-MM-DD 格式)
   * @param endDate 可選的報告結束日期 (YYYY-MM-DD 格式)
   * @returns 生成的報告內容
   */
  public static async generateReportWithDateRange(outputPath: string, startDate?: string, endDate?: string): Promise<string> {
    try {
      // 獲取所有任務數據
      let tasks = await TaskManagerTool.getAllTasks();

      // 根據日期範圍篩選任務
      if (startDate || endDate) {
        tasks = this.filterTasksByDateRange(tasks, startDate, endDate);
      }

      // 基於篩選後的任務獲取分析數據
      const analysis = this.analyzeFilteredTasks(tasks);

      // 生成報告內容
      const report = this.buildReportContent(tasks, analysis, startDate, endDate);

      // 確保輸出目錄存在
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // 保存到文件
      fs.writeFileSync(outputPath, report, 'utf-8');

      return report;
    } catch (error) {
      console.error('生成任務報告失敗:', error);
      throw new Error(`生成任務報告失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  }

  /**
   * 根據日期範圍篩選任務
   * @param tasks 所有任務
   * @param startDate 開始日期 (YYYY-MM-DD 格式)
   * @param endDate 結束日期 (YYYY-MM-DD 格式)
   * @returns 篩選後的任務列表
   */
  private static filterTasksByDateRange(tasks: Task[], startDate?: string, endDate?: string): Task[] {
    return tasks.filter(task => {
      // 使用 createdAt 作為基本篩選條件
      const taskDate = new Date(task.createdAt);

      // 檢查開始日期
      if (startDate) {
        const startDateTime = new Date(startDate);
        // 設置時間為一天的開始 (00:00:00)
        startDateTime.setHours(0, 0, 0, 0);
        if (taskDate < startDateTime) {
          return false;
        }
      }

      // 檢查結束日期
      if (endDate) {
        const endDateTime = new Date(endDate);
        // 設置時間為一天的結束 (23:59:59)
        endDateTime.setHours(23, 59, 59, 999);
        if (taskDate > endDateTime) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * 分析篩選後的任務數據
   * @param tasks 篩選後的任務列表
   * @returns 任務分析結果
   */
  private static analyzeFilteredTasks(tasks: Task[]): any {
    // 初始化分析結果
    const analysis: any = {
      totalTasks: tasks.length,
      completedTasks: 0,
      pendingTasks: 0,
      inProgressTasks: 0,
      cancelledTasks: 0,
      overdueTasksCount: 0,
      tagDistribution: {}
    };

    // 計算各類型任務數量
    tasks.forEach(task => {
      // 根據狀態分類
      switch (task.status) {
        case TaskStatus.COMPLETED:
          analysis.completedTasks++;
          break;
        case TaskStatus.PENDING:
          analysis.pendingTasks++;
          break;
        case TaskStatus.IN_PROGRESS:
          analysis.inProgressTasks++;
          break;
        case TaskStatus.CANCELLED:
          analysis.cancelledTasks++;
          break;
      }

      // 檢查過期任務
      if (task.dueDate && task.status !== TaskStatus.COMPLETED && task.status !== TaskStatus.CANCELLED) {
        const dueDate = new Date(task.dueDate);
        const now = new Date();
        if (dueDate < now) {
          analysis.overdueTasksCount++;
        }
      }

      // 計算標籤分佈
      task.tags.forEach(tag => {
        if (!analysis.tagDistribution[tag]) {
          analysis.tagDistribution[tag] = 0;
        }
        analysis.tagDistribution[tag]++;
      });
    });

    // 計算完成任務的平均完成時間
    const completedTasks = tasks.filter(task => task.status === TaskStatus.COMPLETED);
    if (completedTasks.length > 0) {
      let totalCompletionTime = 0;
      let completedTasksWithTimes = 0;

      completedTasks.forEach(task => {
        const createdDate = new Date(task.createdAt);
        const updatedDate = new Date(task.updatedAt);
        const completionTime = updatedDate.getTime() - createdDate.getTime();

        // 轉換為小時
        const completionTimeHours = completionTime / (1000 * 60 * 60);

        if (!isNaN(completionTimeHours)) {
          totalCompletionTime += completionTimeHours;
          completedTasksWithTimes++;
        }
      });

      if (completedTasksWithTimes > 0) {
        analysis.averageCompletionTime = totalCompletionTime / completedTasksWithTimes;
      }
    }

    return analysis;
  }

  /**
   * 構建報告內容
   * @param tasks 所有任務
   * @param analysis 任務分析結果
   * @param startDate 可選的起始日期
   * @param endDate 可選的結束日期
   * @returns 完整的報告內容
   */
  private static buildReportContent(tasks: Task[], analysis: any, startDate?: string, endDate?: string): string {
    let report = `# 任務進度分析報告\n\n`;

    // 添加日期範圍信息
    if (startDate || endDate) {
      report += `## 報告日期範圍\n\n`;
      if (startDate && endDate) {
        report += `- 報告涵蓋從 **${startDate}** 到 **${endDate}** 期間的任務\n\n`;
      } else if (startDate) {
        report += `- 報告涵蓋從 **${startDate}** 開始的任務\n\n`;
      } else if (endDate) {
        report += `- 報告涵蓋直到 **${endDate}** 的任務\n\n`;
      }
    }

    // 1. 總體進度概況
    report += `## 總體進度概況\n\n`;
    report += `| 指標 | 數值 |\n`;
    report += `|------|------|\n`;
    report += `| 總任務數 | ${analysis.totalTasks} |\n`;
    report += `| 已完成任務 | ${analysis.completedTasks} |\n`;
    report += `| 待處理任務 | ${analysis.pendingTasks} |\n`;
    report += `| 進行中任務 | ${analysis.inProgressTasks} |\n`;
    report += `| 已取消任務 | ${analysis.cancelledTasks} |\n`;
    report += `| 逾期任務數 | ${analysis.overdueTasksCount} |\n`;

    if (analysis.averageCompletionTime) {
      const hours = analysis.averageCompletionTime.toFixed(2);
      const minutes = Math.round(analysis.averageCompletionTime * 60);
      report += `| 平均完成時間 | ${hours} 小時 (約${minutes}分鐘) |\n`;
    }

    report += `\n`;

    // 2. 任務標籤分布
    report += `## 任務標籤分布\n\n`;
    report += `| 標籤 | 任務數量 |\n`;
    report += `|------|----------|\n`;

    const tagDistribution = analysis.tagDistribution;
    const sortedTags = Object.keys(tagDistribution).sort((a, b) =>
      tagDistribution[b] - tagDistribution[a]
    );

    for (const tag of sortedTags) {
      report += `| ${tag} | ${tagDistribution[tag]} |\n`;
    }

    report += `\n`;

    // 3. 分類任務
    const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED);
    const pendingTasks = tasks.filter(t => t.status === TaskStatus.PENDING);
    const inProgressTasks = tasks.filter(t => t.status === TaskStatus.IN_PROGRESS);
    const cancelledTasks = tasks.filter(t => t.status === TaskStatus.CANCELLED);

    // 已完成任務列表
    report += `## 任務完成情況\n\n`;

    if (completedTasks.length > 0) {
      report += `### 已完成任務 (${completedTasks.length})\n\n`;
      completedTasks.forEach((task, index) => {
        report += this.formatTaskDetails(task, index + 1);
      });
    }

    // 進行中任務列表
    if (inProgressTasks.length > 0) {
      report += `### 進行中任務 (${inProgressTasks.length})\n\n`;
      inProgressTasks.forEach((task, index) => {
        report += this.formatTaskDetails(task, index + 1);
      });
    }

    // 待處理任務列表
    if (pendingTasks.length > 0) {
      report += `### 待處理任務 (${pendingTasks.length})\n\n`;
      pendingTasks.forEach((task, index) => {
        report += this.formatTaskDetails(task, index + 1);
      });
    }

    // 已取消任務列表
    if (cancelledTasks.length > 0) {
      report += `### 已取消任務 (${cancelledTasks.length})\n\n`;
      cancelledTasks.forEach((task, index) => {
        report += this.formatTaskDetails(task, index + 1);
      });
    }

    // 4. 為項目提出建議
    report += `## 關鍵任務優先事項\n\n`;

    const incompleteSteps = pendingTasks
      .concat(inProgressTasks)
      .flatMap(task => task.steps.filter(step => !step.completed))
      .sort((a, b) => (a.estimatedTime || 0) - (b.estimatedTime || 0));

    if (incompleteSteps.length > 0) {
      report += `根據當前項目進度，建議優先處理以下項目：\n\n`;

      // 獲取優先處理的前3個（或更少）步驟
      const prioritySteps = incompleteSteps.slice(0, 3);
      prioritySteps.forEach((step, index) => {
        const task = tasks.find(t => t.steps.some(s => s.id === step.id));
        if (task) {
          report += `${index + 1}. **${step.description}** - 來自任務「${task.title}」\n`;
        }
      });

      report += `\n`;
    }

    // 5. 結語和建議
    report += `## 建議\n\n`;

    if (analysis.overdueTasksCount > 0) {
      report += `1. 有 ${analysis.overdueTasksCount} 個任務已逾期，建議優先處理這些任務。\n`;
    }

    if (pendingTasks.length > 0) {
      report += `${analysis.overdueTasksCount > 0 ? '2' : '1'}. 有 ${pendingTasks.length} 個待處理任務，可以根據優先級開始處理。\n`;
    }

    const stepsCount = tasks.reduce((sum, task) => sum + task.steps.length, 0);
    const completedStepsCount = tasks.reduce((sum, task) =>
      sum + task.steps.filter(step => step.completed).length, 0);

    const completionPercentage = stepsCount > 0 ? Math.round((completedStepsCount / stepsCount) * 100) : 0;

    report += `${analysis.overdueTasksCount > 0 || pendingTasks.length > 0 ? '3' : '1'}. 項目整體完成度約為 ${completionPercentage}%。`;

    if (completionPercentage < 25) {
      report += ` 項目處於初期階段，建議制定詳細的開發計劃。\n`;
    } else if (completionPercentage < 50) {
      report += ` 項目進展良好，繼續按計劃推進。\n`;
    } else if (completionPercentage < 75) {
      report += ` 項目已過半，可以開始考慮測試和優化工作。\n`;
    } else {
      report += ` 項目即將完成，可以開始進行最終測試和準備發布。\n`;
    }

    return report;
  }

  /**
   * 格式化單個任務的詳細信息
   * @param task 任務對象
   * @param index 序號
   * @returns 格式化的任務信息文本
   */
  private static formatTaskDetails(task: Task, index: number): string {
    const completedSteps = task.steps.filter(step => step.completed).length;
    const totalSteps = task.steps.length;
    const completionPercentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    let taskDetails = `${index}. **${task.title}**\n`;
    taskDetails += `   - 描述：${task.description}\n`;
    taskDetails += `   - 已完成步驟：${completedSteps}/${totalSteps} (${completionPercentage}%)\n`;
    taskDetails += `   - 優先級：${task.priority}\n`;
    taskDetails += `   - 創建日期：${new Date(task.createdAt).toISOString().split('T')[0]}\n`;

    if (task.dueDate) {
      const dueDate = new Date(task.dueDate);
      const now = new Date();
      const isOverdue = dueDate < now && task.status !== TaskStatus.COMPLETED;

      taskDetails += `   - 到期日：${dueDate.toISOString().split('T')[0]}`;
      if (isOverdue) {
        taskDetails += ` (已逾期)`;
      }
      taskDetails += `\n`;
    }

    taskDetails += `   - 標籤：${task.tags.join(', ')}\n`;

    // 列出未完成的步驟
    const incompleteSteps = task.steps.filter(step => !step.completed);
    if (incompleteSteps.length > 0 && task.status !== TaskStatus.COMPLETED) {
      taskDetails += `   - 待完成項目：\n`;
      incompleteSteps.forEach(step => {
        taskDetails += `     - ${step.description}\n`;
      });
    }

    // 列出已完成的步驟
    if (completedSteps > 0 && completedSteps < totalSteps) {
      taskDetails += `   - 已完成項目：\n`;
      task.steps.filter(step => step.completed).forEach(step => {
        taskDetails += `     - ${step.description}\n`;
      });
    }

    taskDetails += `\n`;
    return taskDetails;
  }
}
