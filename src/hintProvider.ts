import * as vscode from "vscode";
import {
  readFileContentSync,
  writeFileContentSync,
  getExtensionStoragePath,
  fileExistsSync,
} from "./fileUtils";

const config = vscode.workspace.getConfiguration("gitCommitHint");
const SplitStr = config.get("prefixExtra", "#comment");
let extensionContext: vscode.ExtensionContext | undefined;

export class HintProvider
  implements
    vscode.CompletionItemProvider,
    vscode.CodeActionProvider,
    vscode.Disposable
{
  private disposables: vscode.Disposable[] = [];
  private diagnosticCollection: vscode.DiagnosticCollection;

  constructor() {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection(
      "scm-input-conventional-commit"
    );
    this.disposables.push(
      this.diagnosticCollection,
      vscode.workspace.onDidChangeTextDocument((e) => {
        setTimeout(() => {
          this._prefixSave(e.document);
        }, 2000);
      })
    );
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
  }

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {
    const config = vscode.workspace.getConfiguration("gitCommitHint");
    if (!config.get("enabled")) {
      return;
    }
    const suggestWidget = new vscode.CodeAction(
      vscode.l10n.t("选择 commit"),
      vscode.CodeActionKind.QuickFix
    );
    suggestWidget.isPreferred = true;
    suggestWidget.command = {
      command: "editor.action.triggerSuggest",
      title: vscode.l10n.t("选择 commit"),
    };
    return [suggestWidget];
  }

  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): vscode.ProviderResult<vscode.CompletionItem[]> {
    const allowedPrefixes = this._getAllHistoryPrefix();
    const completions = allowedPrefixes.map((prefix, index) => {
      const completionItem = new vscode.CompletionItem(
        `${prefix}`,
        vscode.CompletionItemKind.Text
      );
      const startPosition = new vscode.Position(0, 0);
      completionItem.sortText = String(index);
      completionItem.insertText = "";
      const totalLength = document.getText()?.length;
      const lineCount = document.lineCount;
      const endPosition = new vscode.Position(
        lineCount,
        totalLength === 0 ? 0 : totalLength - 1
      );
      const middlePosition = new vscode.Position(0, prefix.length - 1);
      completionItem.additionalTextEdits = [
        vscode.TextEdit.replace(
          new vscode.Range(startPosition, middlePosition),
          `${prefix}`
        ),
        vscode.TextEdit.replace(
          new vscode.Range(middlePosition, endPosition),
          ` ${SplitStr} `
        ),
      ];

      return completionItem;
    });
    return completions;
  }

  private _saveNewCommitToFile(text: string): void {
    const storagePath = getExtensionStoragePath(extensionContext);
    const filePathToWrite = vscode.workspace.asRelativePath(
      vscode.Uri.file(storagePath + "/commitHintHistory")
    );
    const fileExist = fileExistsSync(filePathToWrite);
    if (!fileExist) {
      writeFileContentSync(filePathToWrite, text);
    } else {
      const fileContent = readFileContentSync(filePathToWrite);
      let splitCtn = fileContent.split(",");
      splitCtn = splitCtn.filter((item) => {
        return item !== text;
      });

      writeFileContentSync(
        filePathToWrite,
        [text, ...splitCtn]
          .filter((item, index) => {
            return index < 10;
          })
          .join(",")
      );
    }
  }

  private _prefixSave(document: vscode.TextDocument): void {
    if (document.languageId !== "scminput") {
      return;
    }

    const text = document.lineAt(0).text.toLocaleLowerCase();
    if (text.includes(SplitStr)) {
      const prefix = text.split(SplitStr)[0].replace(" ", "");
      this._saveNewCommitToFile(prefix);
    }
  }

  private _getAllHistoryPrefix(): string[] {
    const storagePath = getExtensionStoragePath(extensionContext);
    const filePathToWrite = vscode.workspace.asRelativePath(
      vscode.Uri.file(storagePath + "/commitHintHistory")
    );
    const fileExist = fileExistsSync(filePathToWrite);
    if (!fileExist) {
      writeFileContentSync(filePathToWrite, "");
      return [];
    } else {
      const fileContent = readFileContentSync(filePathToWrite);
      const splitCtn = fileContent.split(",");
      return splitCtn.filter((item) => item !== "");
    }
  }
}

export function activateExtensionContext(context: vscode.ExtensionContext) {
  extensionContext = context;
}

export function getExtensionContext(): vscode.ExtensionContext | undefined {
  return extensionContext;
}
