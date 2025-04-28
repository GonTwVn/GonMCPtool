/**
 * 任務報告生成器
 * 生成任務進度的 Markdown 格式報告
 */

import fs from 'fs';
import path from 'path';
import { TaskManagerTool } from './taskManagerTool.js';
import { Task, TaskStatus, TaskAnalysis } from './interfaces/TaskManager.js';
import { TaskTimeUtils } from './utils/taskTimeUtils.js';

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
  private static analyzeFilteredTasks(tasks: Task[]): TaskAnalysis {
    // 初始化分析結果
    const analysis: TaskAnalysis = {
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
        // 只處理有實際完成時間的任務
        if (!task.actualCompletionDate) return;
        
        // 使用工具類計算完成時間
        const completionTimeHours = TaskTimeUtils.calculateTaskWorkTimeHours(task);

        if (!isNaN(completionTimeHours) && completionTimeHours > 0) {
          totalCompletionTime += completionTimeHours;
          completedTasksWithTimes++;
        }
      });

      if (completedTasksWithTimes > 0) {
        analysis.averageCompletionTime = totalCompletionTime / completedTasksWithTimes;
      }
    }

    // 計算完成任務的實際時間與預計時間的差異
    if (completedTasks.length > 0) {
      let totalTimeDifference = 0;
      let tasksWithTimeDifference = 0;
      const taskTimeDifferences: Array<{
        taskId: string;
        title: string;
        completionDate: string;
        estimatedTotalTime: number;
        actualWorkTime: number;
        timeDifference: number;
      }> = [];

      completedTasks.forEach(task => {
        // 只處理有步驟、有預計完成時間且有實際完成時間的任務
        if (!task.actualCompletionDate) return;
        
        const stepsWithEstimatedTime = task.steps.filter(step => 
          typeof step.estimatedTime === 'number' && step.estimatedTime > 0
        );
        
        if (stepsWithEstimatedTime.length > 0) {
          // 使用工具類計算時間
          const timeInfo = TaskTimeUtils.getTaskTimeInfo(task);
          const totalEstimatedTime = timeInfo.estimatedTotalTime;
          const actualCompletionMinutes = timeInfo.actualWorkTime;
          const timeDifference = timeInfo.timeDifference || 0; // 如果返回null，使用0
          
          // 只有在有有效的時間差異時才添加到分析中
          if (timeDifference !== null && actualCompletionMinutes > 0) {
            // 記錄任務時間差異詳情
            taskTimeDifferences.push({
              taskId: task.id,
              title: task.title,
              completionDate: task.actualCompletionDate,
              estimatedTotalTime: totalEstimatedTime,
              actualWorkTime: actualCompletionMinutes,
              timeDifference
            });
            
            totalTimeDifference += timeDifference;
            tasksWithTimeDifference++;
          }
        }
      });

      // 計算平均時間差異
      if (tasksWithTimeDifference > 0) {
        analysis.averageTimeDifference = totalTimeDifference / tasksWithTimeDifference;
        analysis.taskTimeDifferences = taskTimeDifferences;
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
  private static buildReportContent(tasks: Task[], analysis: TaskAnalysis, startDate?: string, endDate?: string): string {
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

    if (analysis.averageTimeDifference !== undefined) {
      const timeDiffHours = (analysis.averageTimeDifference / 60).toFixed(2);
      const timeDiffMinutes = Math.round(analysis.averageTimeDifference);
      const timeDiffStatus = analysis.averageTimeDifference > 0 ? '超出預計' : '提前完成';
      report += `| 平均時間差異 | ${timeDiffHours} 小時 (約${Math.abs(timeDiffMinutes)}分鐘${timeDiffStatus}) |\n`;
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

    // 5. 實際開始時間分析
    const tasksWithActualStartDate = tasks.filter(t => t.actualStartDate);
    if (tasksWithActualStartDate.length > 0) {
      report += `\n## 任務實際開始時間分析\n\n`;
      report += `共有 ${tasksWithActualStartDate.length} 個任務記錄了實際開始時間，佔總任務數的 ${((tasksWithActualStartDate.length / tasks.length) * 100).toFixed(1)}%\n\n`;
      
      // 計算計劃與實際開始時間的差異
      const tasksWithBothDates = tasksWithActualStartDate.filter(t => t.plannedStartDate);
      if (tasksWithBothDates.length > 0) {
        report += `| 任務名稱 | 計劃開始日期 | 實際開始日期 | 差異(天) |\n`;
        report += `|---------|--------------|--------------|---------|\n`;
        
        tasksWithBothDates.forEach(task => {
          const plannedDate = new Date(task.plannedStartDate!);
          const actualDate = new Date(task.actualStartDate!);
          const diffDays = TaskTimeUtils.calculateDaysDifference(plannedDate, actualDate);
          const diffSymbol = diffDays > 0 ? '+' : '';
          
          report += `| ${task.title} | ${plannedDate.toISOString().split('T')[0]} | ${actualDate.toISOString().split('T')[0]} | ${diffSymbol}${diffDays} |\n`;
        });
        
        // 計算平均延遲天數
        const totalDiffDays = tasksWithBothDates.reduce((sum, task) => {
          const plannedDate = new Date(task.plannedStartDate!);
          const actualDate = new Date(task.actualStartDate!);
          return sum + TaskTimeUtils.calculateDaysDifference(plannedDate, actualDate);
        }, 0);
        
        const avgDiffDays = totalDiffDays / tasksWithBothDates.length;
        report += `\n平均實際開始時間與計劃的差異：${avgDiffDays.toFixed(1)} 天\n`;
      }
    }

    // 6. 結語和建議
    report += `\n## 建議\n\n`;

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

    // 添加任務完成時間分析章節
    if (analysis.taskTimeDifferences && analysis.taskTimeDifferences.length > 0) {
      report += `\n## 任務完成時間分析\n\n`;
      report += `| 任務名稱 | 完成日期 | 預計時間(分鐘) | 實際時間(分鐘) | 時間差異(分鐘) | 差異比例 |\n`;
      report += `|---------|----------|----------------|----------------|----------------|-----------|\n`;

      // 按時間差異排序，先列出超時最嚴重的
      const sortedTasks = [...analysis.taskTimeDifferences].sort((a, b) => b.timeDifference - a.timeDifference);

      for (const task of sortedTasks) {
        // 確保完成日期使用真實的完成日期而不是updatedAt
        const completionDate = task.completionDate ? TaskTimeUtils.formatDate(task.completionDate) || new Date(task.completionDate).toISOString().split('T')[0] : '';
        const timeDiff = task.timeDifference.toFixed(2);
        const diffPercentage = ((task.timeDifference / task.estimatedTotalTime) * 100).toFixed(1);
        const symbol = task.timeDifference > 0 ? '+' : '';
        report += `| ${task.title} | ${completionDate} | ${task.estimatedTotalTime.toFixed(2)} | ${task.actualWorkTime.toFixed(2)} | ${symbol}${timeDiff} | ${symbol}${diffPercentage}% |\n`;
      }

      // 添加時間預估分析
      report += `\n### 時間預估準確性分析\n\n`;

      // 計算準確和不準確的任務數量
      const accurateTasks = sortedTasks.filter(t => Math.abs(t.timeDifference / t.estimatedTotalTime) <= 0.2).length;
      const underestimatedTasks = sortedTasks.filter(t => t.timeDifference > 0 && t.timeDifference / t.estimatedTotalTime > 0.2).length;
      const overestimatedTasks = sortedTasks.filter(t => t.timeDifference < 0 && Math.abs(t.timeDifference) / t.estimatedTotalTime > 0.2).length;

      report += `- 時間預估準確的任務 (差異在±20%內)：${accurateTasks} 個，佔比 ${((accurateTasks / sortedTasks.length) * 100).toFixed(1)}%\n`;
      report += `- 時間被低估的任務 (實際超出預計20%以上)：${underestimatedTasks} 個，佔比 ${((underestimatedTasks / sortedTasks.length) * 100).toFixed(1)}%\n`;
      report += `- 時間被高估的任務 (實際少於預計20%以上)：${overestimatedTasks} 個，佔比 ${((overestimatedTasks / sortedTasks.length) * 100).toFixed(1)}%\n`;

      // 添加最顯著的任務說明
      if (sortedTasks.length > 0) {
        const mostUnderestimated = sortedTasks[0]; // 最被低估的任務
        const mostOverestimated = sortedTasks[sortedTasks.length - 1]; // 最被高估的任務

        if (mostUnderestimated.timeDifference > 0) {
          const diff = ((mostUnderestimated.timeDifference / mostUnderestimated.estimatedTotalTime) * 100).toFixed(1);
          report += `\n最顯著被低估的任務：「${mostUnderestimated.title}」，實際用時超出預計 ${diff}%\n`;
        }

        if (mostOverestimated.timeDifference < 0) {
          const diff = ((Math.abs(mostOverestimated.timeDifference) / mostOverestimated.estimatedTotalTime) * 100).toFixed(1);
          report += `最顯著被高估的任務：「${mostOverestimated.title}」，實際用時少於預計 ${diff}%\n`;
        }
      }

      // 添加完成趨勢分析
      if (sortedTasks.length >= 3) {
        report += `\n### 完成效率趨勢分析\n\n`;

        // 任務按創建日期排序
        const chronologicalTasks = [...sortedTasks].sort((a, b) => {
          return new Date(a.completionDate).getTime() - new Date(b.completionDate).getTime();
        });

        // 計算前半部分和後半部分的平均時間差異
        const halfIndex = Math.floor(chronologicalTasks.length / 2);
        const firstHalf = chronologicalTasks.slice(0, halfIndex);
        const secondHalf = chronologicalTasks.slice(halfIndex);

        // 計算平均差異比例（實際與預計的比值）
        const firstHalfRatio = firstHalf.reduce((sum, task) => sum + (task.actualWorkTime / task.estimatedTotalTime), 0) / firstHalf.length;
        const secondHalfRatio = secondHalf.reduce((sum, task) => sum + (task.actualWorkTime / task.estimatedTotalTime), 0) / secondHalf.length;

        report += `- 項目前期完成效率：實際時間為預計時間的 ${firstHalfRatio.toFixed(2)} 倍\n`;
        report += `- 項目後期完成效率：實際時間為預計時間的 ${secondHalfRatio.toFixed(2)} 倍\n`;

        if (secondHalfRatio < firstHalfRatio) {
          const improvement = ((1 - secondHalfRatio / firstHalfRatio) * 100).toFixed(1);
          report += `- 效率提升：項目後期完成效率提高了 ${improvement}%\n`;
        } else if (secondHalfRatio > firstHalfRatio) {
          const decrease = ((secondHalfRatio / firstHalfRatio - 1) * 100).toFixed(1);
          report += `- 效率下降：項目後期完成效率下降了 ${decrease}%\n`;
        } else {
          report += `- 效率穩定：項目前後期完成效率基本一致\n`;
        }
      }
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
    
    // 添加計劃開始時間
    if (task.plannedStartDate) {
      taskDetails += `   - 計劃開始日期：${new Date(task.plannedStartDate).toISOString().split('T')[0]}\n`;
    }
    
    // 使用工具類格式化日期
    const timeInfo = TaskTimeUtils.getTaskTimeInfo(task);
    
    // 添加實際開始時間
    if (task.actualStartDate) {
      taskDetails += `   - 實際開始日期：${timeInfo.formattedStartDate}\n`;
    }
    
    // 添加實際完成時間
    if (task.actualCompletionDate) {
      taskDetails += `   - 實際完成日期：${timeInfo.formattedCompletionDate}\n`;
    }

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

    // 添加预计完成时间信息
    const totalEstTime = TaskTimeUtils.calculateTotalEstimatedTime(task);
    if (totalEstTime > 0) {
      taskDetails += `   - 預計完成時間：${totalEstTime} 分鐘\n`;
    }

    taskDetails += `\n`;
    return taskDetails;
  }
}
