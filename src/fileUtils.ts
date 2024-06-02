import * as vscode from "vscode";
import * as fs from "fs";
export const getExtensionStoragePath = (
  extensionContext?: vscode.ExtensionContext
) => {
  if (extensionContext) {
    // 获取当前扩展的存储路径
    const storagePath = extensionContext.globalStorageUri;
    return storagePath?.fsPath;
  } else {
    console.error("Extension context not available.");
    return "";
  }
};

export function fileExistsSync(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    console.error(`检查文件是否存在时发生错误: ${error}`);
    return false;
  }
}

export function createDir(dirPath: string) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (error) {
    console.error(`创建目录失败: ${error}`);
  }
}

export const readFileContentSync = (filePath: string): string => {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return content;
  } catch (error) {
    vscode.window.showErrorMessage(`读取文件失败: ${error}`);
    return "";
  }
};

export const writeFileContentSync = (
  filePath: string,
  content: string
): void => {
  try {
    fs.writeFileSync(filePath, content, { encoding: "utf8", flag: "w" });
  } catch (error) {
    vscode.window.showErrorMessage(`写入文件失败: ${error}`);
  }
};
