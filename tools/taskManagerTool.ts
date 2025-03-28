/**
 * 任務管理器工具
 * 提供創建、讀取、更新和刪除任務的功能
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Task, TaskStep, TaskStatus, TaskFilter, TaskAnalysis } from './interfaces/TaskManager.js';

export class TaskManagerTool {
  private static TASKS_DIR = './task';
  private static TASKS_FILE = 'tasks.json';

  /**
   * 確保任務目錄存在
   */
  private static async ensureTasksDirectory(): Promise<void> {
    const tasksPath = path.resolve(this.TASKS_DIR);

    try {
      if (!fs.existsSync(tasksPath)) {
        fs.mkdirSync(tasksPath, { recursive: true });
      }

      const tasksFilePath = path.join(tasksPath, this.TASKS_FILE);
      if (!fs.existsSync(tasksFilePath)) {
        fs.writeFileSync(tasksFilePath, JSON.stringify({ tasks: [] }, null, 2));
      }
    } catch (error) {
      console.error('Error ensuring tasks directory:', error);
      throw new Error(`無法創建任務目錄: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  }

  /**
   * 獲取任務文件路徑
   */
  private static getTasksFilePath(): string {
    return path.join(path.resolve(this.TASKS_DIR), this.TASKS_FILE);
  }

  /**
   * 讀取所有任務
   */
  private static async readTasks(): Promise<Task[]> {
    await this.ensureTasksDirectory();

    try {
      const tasksFile = this.getTasksFilePath();
      const fileContent = fs.readFileSync(tasksFile, 'utf-8');
      const data = JSON.parse(fileContent);
      return data.tasks || [];
    } catch (error) {
      console.error('Error reading tasks:', error);
      throw new Error(`讀取任務失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  }

  /**
   * 寫入所有任務
   */
  private static async writeTasks(tasks: Task[]): Promise<void> {
    await this.ensureTasksDirectory();

    try {
      const tasksFile = this.getTasksFilePath();
      fs.writeFileSync(tasksFile, JSON.stringify({ tasks }, null, 2));
    } catch (error) {
      console.error('Error writing tasks:', error);
      throw new Error(`寫入任務失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  }

  /**
   * 創建新任務
   */
  public static async createTask(
    title: string,
    description: string,
    steps: Omit<TaskStep, 'id'>[],
    tags: string[] = [],
    dueDate?: string,
    priority: number = 3
  ): Promise<Task> {
    if (!title || !description) {
      throw new Error('任務標題和描述不能為空');
    }

    if (priority < 1 || priority > 5) {
      throw new Error('任務優先級必須在1到5之間');
    }

    // 獲取現有任務
    const tasks = await this.readTasks();

    // 創建新任務
    const now = new Date().toISOString();
    const taskSteps = steps.map((step, index) => ({
      ...step,
      id: uuidv4(),
      order: step.order !== undefined ? step.order : index + 1,
      completed: step.completed !== undefined ? step.completed : false
    }));

    const newTask: Task = {
      id: uuidv4(),
      title,
      description,
      steps: taskSteps,
      tags,
      createdAt: now,
      updatedAt: now,
      dueDate,
      status: TaskStatus.PENDING,
      priority
    };

    // 添加新任務
    tasks.push(newTask);

    // 保存所有任務
    await this.writeTasks(tasks);

    return newTask;
  }

  /**
   * 獲取所有任務
   */
  public static async getAllTasks(): Promise<Task[]> {
    return await this.readTasks();
  }

  /**
   * 根據ID獲取任務
   */
  public static async getTaskById(id: string): Promise<Task | null> {
    const tasks = await this.readTasks();
    const task = tasks.find(t => t.id === id);
    return task || null;
  }

  /**
   * 更新任務
   */
  public static async updateTask(id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>): Promise<Task | null> {
    const tasks = await this.readTasks();
    const taskIndex = tasks.findIndex(t => t.id === id);

    if (taskIndex === -1) {
      return null;
    }

    // 更新任務
    tasks[taskIndex] = {
      ...tasks[taskIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // 保存所有任務
    await this.writeTasks(tasks);

    return tasks[taskIndex];
  }

  /**
   * 刪除任務
   */
  public static async deleteTask(id: string): Promise<boolean> {
    const tasks = await this.readTasks();
    const initialLength = tasks.length;

    const filteredTasks = tasks.filter(t => t.id !== id);

    if (filteredTasks.length === initialLength) {
      return false;
    }

    // 保存所有任務
    await this.writeTasks(filteredTasks);

    return true;
  }

  /**
   * 更新任務步驟
   */
  public static async updateTaskStep(taskId: string, stepId: string, updates: Partial<Omit<TaskStep, 'id'>>): Promise<Task | null> {
    const tasks = await this.readTasks();
    const taskIndex = tasks.findIndex(t => t.id === taskId);

    if (taskIndex === -1) {
      return null;
    }

    const task = tasks[taskIndex];
    const stepIndex = task.steps.findIndex(s => s.id === stepId);

    if (stepIndex === -1) {
      return null;
    }

    // 更新步驟
    task.steps[stepIndex] = {
      ...task.steps[stepIndex],
      ...updates
    };

    // 更新任務
    task.updatedAt = new Date().toISOString();

    // 如果所有步驟都已完成，則更新任務狀態為已完成
    const allStepsCompleted = task.steps.every(s => s.completed);
    if (allStepsCompleted && task.status !== TaskStatus.COMPLETED) {
      task.status = TaskStatus.COMPLETED;
    }

    // 保存所有任務
    await this.writeTasks(tasks);

    return task;
  }

  /**
   * 添加任務步驟
   */
  public static async addTaskStep(
    taskId: string,
    description: string,
    order?: number,
    estimatedTime?: number
  ): Promise<Task | null> {
    const tasks = await this.readTasks();
    const taskIndex = tasks.findIndex(t => t.id === taskId);

    if (taskIndex === -1) {
      return null;
    }

    const task = tasks[taskIndex];

    // 確定步驟順序
    const newOrder = order || task.steps.length + 1;

    // 創建新步驟
    const newStep: TaskStep = {
      id: uuidv4(),
      description,
      completed: false,
      order: newOrder,
      estimatedTime
    };

    // 添加新步驟
    task.steps.push(newStep);

    // 重新排序步驟
    task.steps.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    // 更新任務
    task.updatedAt = new Date().toISOString();

    // 保存所有任務
    await this.writeTasks(tasks);

    return task;
  }

  /**
   * 刪除任務步驟
   */
  public static async deleteTaskStep(taskId: string, stepId: string): Promise<Task | null> {
    const tasks = await this.readTasks();
    const taskIndex = tasks.findIndex(t => t.id === taskId);

    if (taskIndex === -1) {
      return null;
    }

    const task = tasks[taskIndex];
    const initialStepsLength = task.steps.length;

    // 刪除步驟
    task.steps = task.steps.filter(s => s.id !== stepId);

    if (task.steps.length === initialStepsLength) {
      return null;
    }

    // 重新排序步驟
    task.steps = task.steps.map((step, index) => ({
      ...step,
      order: index + 1
    }));

    // 更新任務
    task.updatedAt = new Date().toISOString();

    // 保存所有任務
    await this.writeTasks(tasks);

    return task;
  }

  /**
   * 搜索任務
   */
  public static async searchTasks(filter: TaskFilter): Promise<Task[]> {
    const tasks = await this.readTasks();

    return tasks.filter(task => {
      // 根據任務狀態過濾
      if (filter.status && task.status !== filter.status) {
        return false;
      }

      // 根據標籤過濾
      if (filter.tags && filter.tags.length > 0) {
        const hasAllTags = filter.tags.every(tag => task.tags.includes(tag));
        if (!hasAllTags) {
          return false;
        }
      }

      // 根據優先級過濾
      if (filter.priority && task.priority !== filter.priority) {
        return false;
      }

      // 根據期限過濾
      if (filter.dueDateFrom && task.dueDate) {
        const dueDateFrom = new Date(filter.dueDateFrom);
        const taskDueDate = new Date(task.dueDate);
        if (taskDueDate < dueDateFrom) {
          return false;
        }
      }

      if (filter.dueDateTo && task.dueDate) {
        const dueDateTo = new Date(filter.dueDateTo);
        const taskDueDate = new Date(task.dueDate);
        if (taskDueDate > dueDateTo) {
          return false;
        }
      }

      // 根據文本搜索
      if (filter.searchText) {
        const searchText = filter.searchText.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(searchText);
        const matchesDescription = task.description.toLowerCase().includes(searchText);
        const matchesSteps = task.steps.some(step =>
          step.description.toLowerCase().includes(searchText)
        );

        if (!matchesTitle && !matchesDescription && !matchesSteps) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * 獲取任務分析
   */
  public static async analyzeTaskStatus(): Promise<TaskAnalysis> {
    const tasks = await this.readTasks();

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

    // 計算任務分佈
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
     * 設置任務所有步驟的完成狀態
     * @param taskId 任務ID
     * @param completed 是否完成
     * @returns 更新後的任務，如果任務不存在則返回null
     */
    public static async setAllStepsStatus(taskId: string, completed: boolean): Promise<Task | null> {
      const tasks = await this.readTasks();
      const taskIndex = tasks.findIndex(t => t.id === taskId);

      if (taskIndex === -1) {
        return null;
      }

      const task = tasks[taskIndex];

      // 更新所有步驟狀態
      task.steps = task.steps.map(step => ({
        ...step,
        completed
      }));

      // 更新任務
      task.updatedAt = new Date().toISOString();

      // 如果所有步驟都已完成並且狀態為已完成，則更新任務狀態
      if (completed && task.status !== TaskStatus.COMPLETED) {
        task.status = TaskStatus.COMPLETED;
      } else if (!completed && task.status === TaskStatus.COMPLETED) {
        // 如果將步驟設為未完成，且當前任務狀態為已完成，則將狀態改為進行中
        task.status = TaskStatus.IN_PROGRESS;
      }

      // 保存所有任務
      await this.writeTasks(tasks);

      return task;
    }
}
