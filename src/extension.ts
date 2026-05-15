import * as vscode from 'vscode';
import { SpreadsheetEditorProvider } from './SpreadsheetEditorProvider';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    SpreadsheetEditorProvider.register(context)
  );
}

export function deactivate() {}
