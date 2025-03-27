import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

/**
 * 執行npm build指令的工具類
 */
export class NpmBuildTool {
  /**
   * 執行npm build指令
   * @param path 要執行build的專案路徑，默認為當前路徑
   * @param options 額外的npm指令選項
   * @returns 包含stdout和stderr的Promise
   */
  static async executeBuild(path: string = '.', options: string = ''): Promise<{ stdout: string; stderr: string }> {
    try {
      console.log(`執行 npm build ${options} 在路徑 ${path}`);
      
      // 構建完整指令
      const command = `cd ${path} && npm run build ${options}`;
      
      // 執行指令
      const { stdout, stderr } = await execPromise(command);
      
      if (stdout) {
        console.log('Build輸出:', stdout);
      }
      
      if (stderr && !stderr.includes('npm notice')) {
        console.error('Build錯誤:', stderr);
      }
      
      return { stdout, stderr };
    } catch (error) {
      console.error('Build執行失敗:', error);
      throw error;
    }
  }
}
