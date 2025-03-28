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
  tags?: string[];
  priority?: number;
  dueDateFrom?: string;
  dueDateTo?: string;
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
}
