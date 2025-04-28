/**
 * 任務管理器介面定義
 */

export interface Task {
  /**
   * 任務唯一識別碼
   */
  id: string;
  
  /**
   * 任務標題
   */
  title: string;
  
  /**
   * 任務詳細描述
   */
  description: string;
  
  /**
   * 任務步驟列表
   */
  steps: TaskStep[];
  
  /**
   * 任務標籤列表
   */
  tags: string[];
  
  /**
   * 任務建立時間
   */
  createdAt: string;
  
  /**
   * 任務更新時間
   */
  updatedAt: string;
  
  /**
   * 任務期限時間
   */
  dueDate?: string;
    /**
     * 預計開始時間
     */
    plannedStartDate?: string;
    /**
     * 實際開始時間
     */
    actualStartDate?: string;
      /**
       * 實際完成時間
       */
      actualCompletionDate?: string;

  
  
  /**
   * 任務狀態
   */
  status: TaskStatus;
  
  /**
   * 任務優先級 (1-5, 1為最高)
   */
  priority: number;
}

/**
 * 任務步驟介面
 */
export interface TaskStep {
  /**
   * 步驟ID
   */
  id: string;
  
  /**
   * 步驟描述
   */
  description: string;
  
  /**
   * 步驟是否完成
   */
  completed?: boolean;
  
  /**
   * 步驟順序
   */
  order?: number;
  
  /**
   * 步驟預估完成時間（分鐘）
   */
  estimatedTime?: number;
}

/**
 * 任務狀態枚舉
 */
export enum TaskStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled"
}

/**
 * 任務搜索過濾器
 */
export interface TaskFilter {
  status?: TaskStatus;
    plannedStartDateFrom?: string;
    plannedStartDateTo?: string;
  tags?: string[];
  priority?: number;
  dueDateFrom?: string;
  dueDateTo?: string;
  createdFrom?: string;
  createdTo?: string;
  searchText?: string;
}

/**
 * 任務分析結果
 */
export interface TaskAnalysis {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  cancelledTasks: number;
  overdueTasksCount: number;
  averageCompletionTime?: number;
  tagDistribution: Record<string, number>;
  /**
   * 實際工作時間與預計時間的平均差異（分鐘）
   * 正值表示超過預計時間，負值表示提前完成
   * 實際工作時間是依據實際開始時間到完成時間計算
   */
  averageTimeDifference?: number;
  /**
   * 按任務分類的時間差異分析
   */
  taskTimeDifferences?: {
    taskId: string;
    title: string;
    completionDate: string;
    estimatedTotalTime: number;
    actualWorkTime: number; // 實際工作時間(從實際開始時間到完成時間)
    timeDifference: number;
  }[];
}
