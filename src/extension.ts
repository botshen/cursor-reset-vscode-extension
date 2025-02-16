// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { exec } from 'child_process';

class SidebarProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'cursorAutoFreeView';

	// 添加一个标志来跟踪脚本是否正在执行
	private isScriptRunning: boolean = false;

	resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		webviewView.webview.options = {
			enableScripts: true
		};

		webviewView.webview.html = this.getHtmlContent();

		// 处理来自 Webview 的消息
		webviewView.webview.onDidReceiveMessage(message => {
			switch (message.command) {
				case 'buttonClicked':
					if (this.isScriptRunning) {
						vscode.window.showInformationMessage('脚本正在执行中，请等待完成...');
						return;
					}
					
					this.isScriptRunning = true;
					
					// 获取基础URL
					const baseUrl = 'https://aizaozao.com/accelerate.php/https://raw.githubusercontent.com/yuaotian/go-cursor-help/refs/heads/master/scripts/run';
					let scriptUrl = '';
					let executeCommand = '';

					// 根据不同操作系统设置不同的脚本和执行命令
					switch (process.platform) {
						case 'darwin':
							scriptUrl = `${baseUrl}/cursor_mac_id_modifier.sh`;
							executeCommand = 'Terminal';
							break;
						case 'win32':
							scriptUrl = `${baseUrl}/cursor_win_id_modifier.ps1`;
							executeCommand = 'powershell';
							break;
						case 'linux':
							scriptUrl = `${baseUrl}/cursor_linux_id_modifier.sh`;
							executeCommand = 'gnome-terminal';
							break;
						default:
							this.isScriptRunning = false;
							vscode.window.showErrorMessage('不支持的操作系统');
							return;
					}

					// 获取脚本内容
					exec(`curl -fsSL ${scriptUrl}`, (error, stdout, stderr) => {
						if (error) {
							this.isScriptRunning = false;
							vscode.window.showErrorMessage('获取脚本失败：' + error.message);
							return;
						}

						if (process.platform === 'win32') {
							// Windows 使用 PowerShell 执行
							exec(`powershell -Command "${stdout}"`, (error) => {
								this.isScriptRunning = false;
								if (error) {
									vscode.window.showErrorMessage('执行脚本失败：' + error.message);
									return;
								}
								vscode.window.showInformationMessage('脚本执行完成！');
							});
						} else {
							// Linux 和 macOS 使用 bash 执行
							const tmpFile = '/tmp/cursor_script.sh';
							require('fs').writeFileSync(tmpFile, stdout);
							
							if (process.platform === 'darwin') {
								// macOS 特定的清理命令
								const restartCursor = `
									security delete-generic-password -s "Cursor Safe Storage"
									echo "清理钥匙串完成"
									echo "即将打开Cursor"
									open -a "Cursor"
								`;
								require('fs').appendFileSync(tmpFile, restartCursor);
							}

							exec(`chmod +x ${tmpFile}`, (error) => {
								if (error) {
									this.isScriptRunning = false;
									vscode.window.showErrorMessage('设置脚本权限失败：' + error.message);
									return;
								}

								const terminalCommand = process.platform === 'darwin' 
									? `osascript -e 'tell application "Terminal" to activate' -e 'tell application "Terminal" to do script "sudo ${tmpFile}"'`
									: `${executeCommand} -- sudo ${tmpFile}`;

								exec(terminalCommand, (error) => {
									this.isScriptRunning = false;
									if (error) {
										vscode.window.showErrorMessage('执行脚本失败：' + error.message);
										return;
									}
									vscode.window.showInformationMessage('脚本已在终端中启动！');
								});
							});
						}
					});
					break;
			}
		});
	}

	private getHtmlContent() {
		return `
			<!DOCTYPE html>
			<html>
			<head>
				<style>
					button {
						width: 100%;
						padding: 8px;
						margin: 8px 0;
						background: var(--vscode-button-background);
						color: var(--vscode-button-foreground);
						border: none;
						cursor: pointer;
					}
					button:hover {
						background: var(--vscode-button-hoverBackground);
					}
					textarea {
						width: 100%;
						height: 200px;
						margin-top: 8px;
						background: var(--vscode-input-background);
						color: var(--vscode-input-foreground);
						border: 1px solid var(--vscode-input-border);
						resize: none;
					}
				</style>
			</head>
			<body>
				<button id="actionButton">🚀点击重置 cursor 机器码</button>
 				
				<script>
					const vscode = acquireVsCodeApi();
					document.getElementById('actionButton').addEventListener('click', () => {
						vscode.postMessage({ command: 'buttonClicked' });
					});

					window.addEventListener('message', event => {
						const message = event.data;
						switch (message.command) {
							case 'updateText':
								document.getElementById('outputArea').value = message.text;
								break;
						}
					});
				</script>
			</body>
			</html>
		`;
	}
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "cursor-auto-free" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('cursor-auto-free.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from cursor-auto-free!');
	});

	// 注册 Webview 视图
	const provider = new SidebarProvider();
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(SidebarProvider.viewType, provider)
	);

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
