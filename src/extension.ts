import * as vscode from "vscode";
import { HintProvider, activateExtensionContext } from "./hintProvider";

export function activate(context: vscode.ExtensionContext) {
  const hintProvider = new HintProvider();

  context.subscriptions.push(
    hintProvider,
    vscode.languages.registerCodeActionsProvider("scminput", hintProvider),
    vscode.languages.registerCompletionItemProvider("scminput", hintProvider)
  );
  activateExtensionContext(context);
}

export function deactivate() {}
