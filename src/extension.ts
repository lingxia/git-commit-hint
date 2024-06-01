import * as vscode from "vscode";
import {
  SummaryLineTypeCompletionItemProvider,
  activateExtensionContext,
} from "./subjectLineCompletionItemProvider";

export function activate(context: vscode.ExtensionContext) {
  const summaryLineCompletionItemProvider =
    new SummaryLineTypeCompletionItemProvider();

  context.subscriptions.push(
    summaryLineCompletionItemProvider,
    vscode.languages.registerCodeActionsProvider(
      "scminput",
      summaryLineCompletionItemProvider
    ),
    vscode.languages.registerCompletionItemProvider(
      "scminput",
      summaryLineCompletionItemProvider
    )
  );
  activateExtensionContext(context);
}

export function deactivate() {}
