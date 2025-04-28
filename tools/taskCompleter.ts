/**
 * 任務完成工具
 * 提供快速將任務標記為完成的功能
 */

import { TaskManagerTool } from './taskManagerTool.js';

export class TaskCompleter {
  /**
   * 完成指定ID的任務
   * @param taskId 任務ID
   * @returns 包含操作結果和訊息的對象
   */
  public static async completeTask(taskId: string): Promise<{ success: boolean; message: string }> {
    try {
      // 獲取任務資訊
      const task = await TaskManagerTool.getTaskById(taskId);
      
      // 檢查任務是否存在
      if (!task) {
        return {
          success: false,
          message: `錯誤：找不到ID為 ${taskId} 的任務`
        };
      }
      
      // 如果任務已經完成，也會更新完成時間
      if (task.status === 'completed') {
        // 重新標記為完成以更新完成時間
        const updatedTask = await TaskManagerTool.completeTask(taskId);
        
        return {
          success: true,
          message: `任務「${task.title}」已經是完成狀態，已更新完成時間`
        };
      }
      
      // 完成任務
      const updatedTask = await TaskManagerTool.completeTask(taskId);
      
      if (!updatedTask) {
        return {
          success: false,
          message: `完成任務時發生未知錯誤`
        };
      }
      
      // 檢查是否所有步驟已完成
      const allStepsCompleted = updatedTask.steps.every(step => step.completed);
      
      // 如果不是所有步驟都完成，則自動完成所有步驟
      if (!allStepsCompleted) {
        await TaskManagerTool.setAllStepsStatus(taskId, true);
        return {
          success: true,
          message: `已完成任務「${updatedTask.title}」並自動標記所有步驟為完成`
        };
      }
      
      return {
        success: true,
        message: `已成功完成任務「${updatedTask.title}」`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知錯誤';
      return {
        success: false,
        message: `完成任務時發生錯誤: ${errorMessage}`
      };
    }
  }
}
