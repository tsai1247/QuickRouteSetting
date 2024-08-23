import * as vscode from "vscode";

function setRemoteSettingPathCommand() {
  vscode.window.showInputBox({
    placeHolder: "請輸入 remoteSetting.mjs 的相對路徑",
  }).then((path) => {
    if (path) {
      const config = vscode.workspace.getConfiguration("quickRouteConfig");
      config.update('remoateSettingPath', path, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(`已設定 remoteSetting.mjs 的相對路徑: ${path}`);
    }
  });
};

function setQuickRouteSetting() {
  // 讓使用者輸入要替換的 key
  vscode.window.showInputBox({
    placeHolder: "請輸入要替換的 key，以逗號分隔",
  }).then(async (keys) => {
    if (keys) {
      try {
        const keyArr = keys.split(',').map((key) => key.trim());
        
        // 設定要替換的 key
        const config = vscode.workspace.getConfiguration("quickRouteConfig");
        await config.update('keyList', keyArr, vscode.ConfigurationTarget.Global);

        vscode.window.showInformationMessage(`已設定要替換的 key: ${keyArr.join(', ')}`);
      }
      catch (error) {
        vscode.window.showErrorMessage('輸入格式錯誤');
      }
    }
  });
}

function quickRouteSetting() {
  // 取得當前根路徑
  const workFolder = vscode.workspace.workspaceFolders?.[0]?.uri.path;
  const config = vscode.workspace.getConfiguration("quickRouteConfig");
  const remoteSettingRelativePath = config.get<string>('remoateSettingPath');

  let remoteSettingPath: vscode.Uri = vscode.Uri.file('');
  if (!workFolder || !remoteSettingRelativePath) {
    // 直接尋找 remoteSetting.mjs
    vscode.workspace.findFiles('remoteSetting.mjs').then((files) => {
      if (files.length === 0) {
        vscode.window.showErrorMessage('找不到 remoteSetting.mjs');
        return;
      }
      vscode.window.showInformationMessage('建議設定 remoteSetting.mjs 的相對路徑');
      remoteSettingPath = files[0];
    });
  }
  else {
    remoteSettingPath = vscode.Uri.file(
      `${workFolder}/${remoteSettingRelativePath}`
    );
  }

  if (!remoteSettingPath || remoteSettingPath.path === '') {
    vscode.window.showErrorMessage('找不到 remoteSetting.mjs');
    return;
  }

  vscode.workspace.fs.readFile(remoteSettingPath).then((remoteSettingFile: any) => {
    let remoteSettingContent = remoteSettingFile.toString();
    
    const keys = config.get<string[]>('keyList');
    if (!keys) {
      vscode.window.showErrorMessage('請先設定要替換的 key');
      return;
    }

    let currentBool: boolean | null = null;
    keys.forEach((key: string) => {
      const match = remoteSettingContent.match(new RegExp(`${key}: {[\\s\\S]*?}`));
      if (!match) {
        vscode.window.showErrorMessage(`找不到 ${key}: { ... }`);
      }
      else {
        const content = match[0];
        let replacedContent;

        if(currentBool === null) {
          currentBool = content.includes("true");
        }
        if (currentBool) {
          replacedContent = content.replace("true", "false");
        }
        else {
          replacedContent = content.replace("false", "true");
        }

        remoteSettingContent = remoteSettingContent.replace(content, replacedContent);
      }
    });

    const newRemoteSettingFile = new TextEncoder().encode(remoteSettingContent);
    vscode.workspace.fs.writeFile(remoteSettingPath, newRemoteSettingFile);
  });
}

/**
 * 啟用插件
 * @param {vscode.ExtensionContext} context - 啟用插件背景數據
 */
export function activate(context: vscode.ExtensionContext) {
  // 插入按鈕: Quick Route Config
  const quickRouteConfigButton = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left
  );
  // 按鈕標題
  quickRouteConfigButton.text = "$(gear) Quick Route Config";
  // 按鈕觸發指令
  quickRouteConfigButton.command = "vscode-quick-route-config.quickRouteConfigOptions";
  // tooltip
  quickRouteConfigButton.tooltip = "快速切換 remoteSetting.mjs 未用到的 key";
  // 按鈕加入工具列
  context.subscriptions.push(quickRouteConfigButton);


  // 註冊指令
  const quickRouteConfigOptionsCommand = vscode.commands.registerCommand(
    "vscode-quick-route-config.quickRouteConfigOptions",
    () => {
      // 讓使用者選擇兩個選項：替換key 或者 設定要替換的 key
      // 1. 替換key
      // 2. 設定要替換的 key
      vscode.window.showQuickPick([
        '切換remoteSetting', 
        '設定 remoteSetting 要替換的 key', 
        '設定 remoteSetting.mjs 的相對路徑'
      ]
      ).then((selected) => {
        if (selected === '切換remoteSetting') {
          quickRouteSetting();
        }
        else if (selected === '設定 remoteSetting 要替換的 key') {
          setQuickRouteSetting();
        }
        else if (selected === '設定 remoteSetting.mjs 的相對路徑') {
          setRemoteSettingPathCommand();
        }
      });
    }
  );

  const quickRouteConfigCommand = vscode.commands.registerCommand(
    "vscode-quick-route-config.quickRouteConfig",
    () => {
      quickRouteSetting();
    }
  );

  // 訂閱指令
  context.subscriptions.push(quickRouteConfigOptionsCommand);
  context.subscriptions.push(quickRouteConfigCommand);

  // 顯示按鈕
  quickRouteConfigButton.show();
}

/**
 * 停用插件
 */
export function deactivate() {}
