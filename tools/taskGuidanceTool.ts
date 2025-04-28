/**
 * 超簡易 AI 任務指導工具
 * 只提供讀取和寫入單一任務指導文件的功能
 */

import fs from 'fs';
import path from 'path';

export class TaskGuidanceTool {
  private static GUIDANCE_FILE_PATH = './task/ai_task_guidance.txt';

  /**
   * 讀取任務指導文件
   * @returns 文件內容，如果文件不存在則返回空字符串
   */
  public static readGuidance(): string {
    try {
      // 確保目錄存在
      const dirPath = path.dirname(this.GUIDANCE_FILE_PATH);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      // 如果文件不存在，則返回空字符串
      if (!fs.existsSync(this.GUIDANCE_FILE_PATH)) {
        return '';
      }
      
      return fs.readFileSync(this.GUIDANCE_FILE_PATH, 'utf-8');
    } catch (error) {
      console.error(`讀取指導文件失敗: ${error}`);
      return '';
    }
  }

  /**
   * 寫入任務指導文件
   * @param content 文件內容
   * @returns 是否成功寫入
   */
  public static writeGuidance(content: string): boolean {
    try {
      // 確保目錄存在
      const dirPath = path.dirname(this.GUIDANCE_FILE_PATH);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      fs.writeFileSync(this.GUIDANCE_FILE_PATH, content, 'utf-8');
      return true;
    } catch (error) {
      console.error(`寫入指導文件失敗: ${error}`);
      return false;
    }
  }
}
