import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

/**
 * 執行npm install指令的工具類
 */
export class NpmInstallTool {
  /**
   * 執行npm install指令
   * @param path 要執行install的專案路徑，默認為當前路徑
   * @param options 額外的npm指令選項，例如 --save-dev 或 --production
   * @returns 包含stdout和stderr的Promise
   */
  static async executeInstall(path: string = '.', options: string = ''): Promise<{ stdout: string; stderr: string }> {
    try {
      console.log(`正在執行 npm install ${options} 在路徑 ${path}`);
      
      // 構建完整指令
      const command = `cd ${path} && npm install ${options}`;
      
      // 執行指令
      const { stdout, stderr } = await execPromise(command);
      
      if (stdout) {
        console.log('Install輸出:', stdout);
      }
      
      if (stderr && !stderr.includes('npm notice')) {
        console.error('Install錯誤:', stderr);
      }
      
      return { stdout, stderr };
    } catch (error) {
      console.error('Install執行失敗:', error);
      throw error;
    }
  }
}
