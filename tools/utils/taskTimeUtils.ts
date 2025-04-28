/**
 * 任務時間計算工具類
 * 提供統一的任務時間計算方法
 */

import { Task } from '../interfaces/TaskManager.js';

export class TaskTimeUtils {
  /**
   * 獲取任務的實際開始時間
   * @param task 任務對象
   * @returns 實際開始時間的Date對象
   */
  public static getTaskStartDate(task: Task): Date {
    // 使用實際開始時間（如果有）或創建時間作為開始點
    return task.actualStartDate 
      ? new Date(task.actualStartDate) 
      : new Date(task.createdAt);
  }

  /**
   * 獲取任務的實際完成時間
   * @param task 任務對象
   * @returns 實際完成時間的Date對象，或null如果沒有完成時間
   */
  public static getTaskCompletionDate(task: Task): Date | null {
    // 只使用actualCompletionDate，不使用updatedAt作為備用
    return task.actualCompletionDate 
      ? new Date(task.actualCompletionDate) 
      : null;
  }

  /**
   * 計算任務的實際工作時間（毫秒）
   * @param task 任務對象
   * @returns 實際工作時間（毫秒）
   */
  public static calculateTaskWorkTimeMs(task: Task): number {
    // 如果沒有actualCompletionDate，則不應計算工作時間
    if (!task.actualCompletionDate) {
      return 0;
    }
    const startDate = this.getTaskStartDate(task);
    const completionDate = new Date(task.actualCompletionDate);
    return completionDate.getTime() - startDate.getTime();
  }

  /**
   * 計算任務的實際工作時間（分鐘）
   * @param task 任務對象
   * @returns 實際工作時間（分鐘），或 0如果不能計算
   */
  public static calculateTaskWorkTimeMinutes(task: Task): number {
    if (!task.actualCompletionDate) return 0;
    return this.calculateTaskWorkTimeMs(task) / (1000 * 60);
  }

  /**
   * 計算任務的實際工作時間（小時）
   * @param task 任務對象
   * @returns 實際工作時間（小時），或 0如果不能計算
   */
  public static calculateTaskWorkTimeHours(task: Task): number {
    if (!task.actualCompletionDate) return 0;
    return this.calculateTaskWorkTimeMs(task) / (1000 * 60 * 60);
  }

  /**
   * 計算任務的總預計完成時間（分鐘）
   * @param task 任務對象
   * @returns 總預計完成時間（分鐘），如果沒有預計時間則返回0
   */
  public static calculateTotalEstimatedTime(task: Task): number {
    // 篩選出有預計完成時間的步驟
    const stepsWithEstimatedTime = task.steps.filter(step =>
      typeof step.estimatedTime === 'number' && step.estimatedTime > 0
    );

    // 計算總預計時間
    return stepsWithEstimatedTime.reduce(
      (sum, step) => sum + (step.estimatedTime || 0), 0
    );
  }

  /**
   * 計算任務的時間差異（實際時間與預計時間的差異，分鐘）
   * @param task 任務對象
   * @returns 時間差異（分鐘），正值表示超出預計時間，負值表示提前完成
   */
  public static calculateTimeDifference(task: Task): number | null {
    // 如果沒有實際完成時間，則返回null
    if (!task.actualCompletionDate) return null;
    
    const totalEstimatedTime = this.calculateTotalEstimatedTime(task);
    
    // 如果沒有預計時間，則返回null
    if (totalEstimatedTime === 0) return null;
    
    const actualWorkTime = this.calculateTaskWorkTimeMinutes(task);
    return actualWorkTime - totalEstimatedTime;
  }

  /**
   * 格式化日期為YYYY-MM-DD格式
   * @param date 日期對象或日期字符串
   * @returns 格式化後的日期字符串
   */
  public static formatDate(date: Date | string | undefined): string | null {
    if (!date) return null;

    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toISOString().split('T')[0];
  }

  /**
   * 計算兩個日期之間的天數差異
   * @param date1 日期1
   * @param date2 日期2
   * @returns 天數差異，正值表示date2晚於date1，負值表示date2早於date1
   */
  public static calculateDaysDifference(date1: Date | string, date2: Date | string): number {
    const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
    const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
    
    // 移除時間部分，只比較日期
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    
    return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * 獲取任務完成時間的詳細信息對象
   * @param task 任務對象
   * @returns 任務時間信息對象
   */
  public static getTaskTimeInfo(task: Task): {
    startDate: Date;
    completionDate: Date | null;
    estimatedTotalTime: number;
    actualWorkTime: number;
    timeDifference: number | null;
    formattedStartDate: string | null;
    formattedCompletionDate: string | null;
  } {
    const startDate = this.getTaskStartDate(task);
    const completionDate = this.getTaskCompletionDate(task);
    const estimatedTotalTime = this.calculateTotalEstimatedTime(task);
    const actualWorkTime = this.calculateTaskWorkTimeMinutes(task);
    const timeDifference = this.calculateTimeDifference(task);

    return {
      startDate,
      completionDate,
      estimatedTotalTime,
      actualWorkTime,
      timeDifference,
      formattedStartDate: this.formatDate(startDate),
      formattedCompletionDate: completionDate ? this.formatDate(completionDate) : null
    };
  }
}
