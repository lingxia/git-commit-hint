import * as vscode from "vscode";
import {
  readFileContentSync,
  writeFileContentSync,
  getExtensionStoragePath,
  fileExistsSync,
} from "./fileUtils";

const SplitStr = "#comment ";
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
      vscode.workspace.onDidOpenTextDocument((d) => this._lintSubjectLine(d)),
      vscode.workspace.onDidChangeTextDocument((e) =>
        this._lintSubjectLine(e.document)
      )
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
      vscode.CodeActionKind.Refactor
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
  ): vscode.ProviderResult<
    vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>
  > {
    if (position.line === 0) {
      const allowedPrefixes = this._getAllowedPrefixes();
      const completions = allowedPrefixes.map((prefix) => {
        const completionItem = new vscode.CompletionItem(
          `${SplitStr}`,
          vscode.CompletionItemKind.Text
        );
        const startPosition = new vscode.Position(0, 0);
        completionItem.sortText = prefix;
        completionItem.insertText = "";
        // if (typeof existingPrefix === "string" && existingPrefix.length > 0) {
        //   // If there's an existing invalid prefix, replace it
        //   const endPosition = new vscode.Position(0, existingPrefix.length);
        //   completionItem.additionalTextEdits = [
        //     vscode.TextEdit.replace(
        //       new vscode.Range(startPosition, endPosition),
        //       prefix
        //     ),
        //   ];
        // } else {
        const lineText = document.lineAt(0);
        // Don't use label as filter text so that completions aren't filtered out when the cursor is at the end of the word and we want to insert some other text prior
        completionItem.filterText = `${lineText.text} ${prefix}`;
        // If the cursor is at a word boundary, accepting the completion will also replace the word at the cursor.
        // Make the insertText the word itself so that the word at the cursor is preserved.
        const whitespaceWordRange = document.getWordRangeAtPosition(
          position,
          /\s+/
        );
        if (!whitespaceWordRange || whitespaceWordRange.isEmpty) {
          // There is no whitespace before the cursor
          completionItem.insertText = document.getText(
            document.getWordRangeAtPosition(position)
          );
        }
        completionItem.additionalTextEdits = [
          vscode.TextEdit.insert(lineText.range.start, `${prefix}: `),
        ];
        // }
        return completionItem;
      });
      return completions;
    }
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
      splitCtn = [text, ...splitCtn];
      writeFileContentSync(
        filePathToWrite,
        (splitCtn || [])
          .filter((item, index) => {
            return index < 10;
          })
          .join(",")
      );
    }
  }

  private _lintSubjectLine(document: vscode.TextDocument): void {
    if (document.languageId !== "scminput") {
      return;
    }

    const text = document.lineAt(0).text.toLocaleLowerCase();
    if (text.includes(SplitStr)) {
      const prefix = text.split(SplitStr)[0].replace(" ", "");
      this._saveNewCommitToFile(prefix);
    }
    console.log(text);

    // this._saveNewCommitToFile(`${text}`);

    // if (!this._isValidSubjectLine(document)) {
    // const allowedPrefixes = this._getAllowedPrefixes();
    // const range = document.lineAt(0).range;
    // const diagnostic = new vscode.Diagnostic(
    //   range,
    //   vscode.l10n.t(
    //     `Subject line should start with one of the following types:\n{0}`,
    //     allowedPrefixes.map((prefix) => `${prefix}:`).join(", ")
    //   ),
    //   vscode.DiagnosticSeverity.Warning
    // );
    // this.diagnosticCollection.set(document.uri, [diagnostic]);
    // } else {
    //   this.diagnosticCollection.clear();
    // }
  }

  // private _isValidSubjectLine(document: vscode.TextDocument): boolean | string {
  //   const text = document.lineAt(0).text.toLocaleLowerCase();
  //   console.log("text==>", text);

  //   const prefix = text.includes(SplitStr) ? text.split(SplitStr)[0] : "";
  //   const allowedPrefixes = this._getAllowedPrefixes();
  //   return allowedPrefixes.includes(prefix) ? true : prefix;
  // }

  private _getAllowedPrefixes(): string[] {
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
