import * as vscode from "vscode";
import { HintProvider, activateExtensionContext } from "./hintProvider";
import { createDir, getExtensionStoragePath } from "./fileUtils";

export function activate(context: vscode.ExtensionContext) {
  const hintProvider = new HintProvider();

  const storagePath = getExtensionStoragePath(context);
  createDir(storagePath);

  context.subscriptions.push(
    hintProvider,
    vscode.languages.registerCodeActionsProvider("scminput", hintProvider),
    vscode.languages.registerCompletionItemProvider("scminput", hintProvider)
  );
  activateExtensionContext(context);
}

export function deactivate() {}
