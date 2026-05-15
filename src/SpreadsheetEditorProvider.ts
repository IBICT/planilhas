import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export class SpreadsheetEditorProvider
  implements vscode.CustomEditorProvider<vscode.CustomDocument>
{
  private readonly _webviews = new Map<string, vscode.WebviewPanel>();
  private readonly _pendingSaves = new Map<string, (data: string) => void>();

  private readonly _onDidChangeCustomDocument = new vscode.EventEmitter<
    vscode.CustomDocumentContentChangeEvent<vscode.CustomDocument>
  >();
  public readonly onDidChangeCustomDocument = this._onDidChangeCustomDocument.event;

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      'planilhas.spreadsheetEditor',
      new SpreadsheetEditorProvider(context),
      { webviewOptions: { retainContextWhenHidden: true } }
    );
  }

  constructor(private readonly context: vscode.ExtensionContext) {}

  async openCustomDocument(
    uri: vscode.Uri,
    _openContext: vscode.CustomDocumentOpenContext,
    _token: vscode.CancellationToken
  ): Promise<vscode.CustomDocument> {
    return { uri, dispose: () => {} };
  }

  async resolveCustomEditor(
    document: vscode.CustomDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    const key = document.uri.toString();
    this._webviews.set(key, webviewPanel);

    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'media')]
    };

    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    const sendFile = () => {
      try {
        const ext = path.extname(document.uri.fsPath).toLowerCase().slice(1);
        const fileData = fs.readFileSync(document.uri.fsPath);
        // CSV: envia como string UTF-8 para o SheetJS interpretar corretamente
        // XLS/XLSX: envia como base64 (formato binário)
        const data = ext === 'csv'
          ? fileData.toString('utf8')
          : fileData.toString('base64');
        webviewPanel.webview.postMessage({ type: 'loadFile', data, ext });
      } catch {}
    };

    webviewPanel.webview.onDidReceiveMessage(message => {
      if (message.type === 'ready') {
        sendFile();
      }
      if (message.type === 'change') {
        this._onDidChangeCustomDocument.fire({ document });
      }
      if (message.type === 'saveData') {
        const resolver = this._pendingSaves.get(key);
        if (resolver) {
          resolver(message.data);
          this._pendingSaves.delete(key);
        }
      }
    });

    // Observa mudanças externas no arquivo
    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(
        vscode.Uri.file(path.dirname(document.uri.fsPath)),
        path.basename(document.uri.fsPath)
      )
    );

    watcher.onDidChange(() => {
      // Pequeno delay para garantir que a escrita foi concluída
      setTimeout(sendFile, 300);
    });

    webviewPanel.onDidDispose(() => {
      this._webviews.delete(key);
      watcher.dispose();
    });
  }

  async saveCustomDocument(
    document: vscode.CustomDocument,
    _cancellation: vscode.CancellationToken
  ): Promise<void> {
    await this._saveToUri(document, document.uri);
  }

  async saveCustomDocumentAs(
    document: vscode.CustomDocument,
    destination: vscode.Uri,
    _cancellation: vscode.CancellationToken
  ): Promise<void> {
    await this._saveToUri(document, destination);
  }

  async revertCustomDocument(
    document: vscode.CustomDocument,
    _cancellation: vscode.CancellationToken
  ): Promise<void> {
    const panel = this._webviews.get(document.uri.toString());
    if (panel) {
      const fileData = fs.readFileSync(document.uri.fsPath);
      panel.webview.postMessage({
        type: 'loadFile',
        data: fileData.toString('base64'),
        ext: path.extname(document.uri.fsPath).toLowerCase().slice(1)
      });
    }
  }

  async backupCustomDocument(
    document: vscode.CustomDocument,
    context: vscode.CustomDocumentBackupContext,
    _cancellation: vscode.CancellationToken
  ): Promise<vscode.CustomDocumentBackup> {
    await this._saveToUri(document, context.destination);
    return {
      id: context.destination.toString(),
      delete: () => { try { fs.unlinkSync(context.destination.fsPath); } catch {} }
    };
  }

  private async _saveToUri(document: vscode.CustomDocument, uri: vscode.Uri): Promise<void> {
    const panel = this._webviews.get(document.uri.toString());
    if (!panel) { throw new Error('Webview não encontrado para salvar'); }

    const data = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout ao salvar')), 10_000);
      this._pendingSaves.set(document.uri.toString(), (d) => {
        clearTimeout(timeout);
        resolve(d);
      });
      panel.webview.postMessage({ type: 'requestSave' });
    });

    fs.writeFileSync(uri.fsPath, Buffer.from(data, 'base64'));
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const xsJs   = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'x-spreadsheet.js'));
    const xsCss  = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'x-spreadsheet.css'));
    const xlsxJs = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'xlsx.full.min.js'));
    const nonce  = getNonce();

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <link rel="stylesheet" href="${xsCss}">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #1e1e1e; }
    #app { width: 100%; height: 100vh; }
    #loading {
      display: flex; align-items: center; justify-content: center;
      height: 100vh; color: #ccc; font-family: sans-serif; font-size: 14px;
    }
  </style>
</head>
<body>
  <div id="loading">Carregando...</div>
  <div id="app" style="display:none"></div>

  <script nonce="${nonce}" src="${xlsxJs}"></script>
  <script nonce="${nonce}" src="${xsJs}"></script>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    let xs = null;
    let currentExt = 'xlsx';

    // SheetJS worksheet → x-spreadsheet format
    function stox(ws, name) {
      if (!ws || !ws['!ref']) { return { name: name || 'Sheet', rows: {} }; }
      const range = XLSX.utils.decode_range(ws['!ref']);
      const rows = {};
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const cells = {};
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
          if (!cell) { continue; }
          cells[C] = { text: XLSX.utils.format_cell(cell) };
        }
        rows[R] = { cells };
      }
      const merges = [];
      if (ws['!merges']) {
        ws['!merges'].forEach(m => merges.push({ sri: m.s.r, sci: m.s.c, eri: m.e.r, eci: m.e.c }));
      }
      return { name: name || 'Sheet', rows, merges };
    }

    // x-spreadsheet format → SheetJS worksheet
    function xtox(xsData) {
      const rows = xsData.rows || {};
      const ws = {};
      let maxR = 0, maxC = 0;
      Object.keys(rows).forEach(rStr => {
        const r = parseInt(rStr);
        if (isNaN(r)) { return; }
        Object.keys(rows[rStr].cells || {}).forEach(cStr => {
          const c = parseInt(cStr);
          if (isNaN(c)) { return; }
          const cell = rows[rStr].cells[cStr];
          if (!cell || cell.text == null) { return; }
          const ref = XLSX.utils.encode_cell({ r, c });
          ws[ref] = { v: cell.text, t: 's' };
          if (r > maxR) { maxR = r; }
          if (c > maxC) { maxC = c; }
        });
      });
      if (!Object.keys(ws).length) { ws['A1'] = { v: '', t: 's' }; }
      ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxR, c: maxC } });
      return ws;
    }

    window.addEventListener('message', event => {
      const msg = event.data;

      if (msg.type === 'loadFile') {
        currentExt = msg.ext;
        try {
          const readType = msg.ext === 'csv' ? 'string' : 'base64';
          const wb = XLSX.read(msg.data, { type: readType });
          const sheets = wb.SheetNames.map(name => stox(wb.Sheets[name], name));

          if (xs) {
            // Recarrega sem recriar o componente
            xs.loadData(sheets);
          } else {
            document.getElementById('loading').style.display = 'none';
            const appEl = document.getElementById('app');
            appEl.style.display = 'block';

            xs = x_spreadsheet(appEl, {
              mode: 'edit',
              showToolbar: true,
              showContextmenu: true,
              view: {
                height: () => document.documentElement.clientHeight,
                width:  () => document.documentElement.clientWidth
              }
            }).loadData(sheets);

            xs.on('change', () => vscode.postMessage({ type: 'change' }));
            window.addEventListener('resize', () => xs.reRender());
          }
        } catch (err) {
          document.getElementById('loading').textContent = 'Erro ao carregar: ' + err.message;
        }
      }

      if (msg.type === 'requestSave') {
        if (!xs) { return; }
        try {
          const wb = XLSX.utils.book_new();
          xs.getData().forEach(sheet => {
            XLSX.utils.book_append_sheet(wb, xtox(sheet), sheet.name || 'Sheet');
          });

          let base64;
          if (currentExt === 'csv') {
            const csv = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
            // Codifica como UTF-8 usando TextEncoder e converte para base64
            const bytes = new TextEncoder().encode(csv);
            let binary = '';
            bytes.forEach(b => { binary += String.fromCharCode(b); });
            base64 = btoa(binary);
          } else {
            base64 = XLSX.write(wb, { bookType: currentExt === 'xls' ? 'xls' : 'xlsx', type: 'base64' });
          }
          vscode.postMessage({ type: 'saveData', data: base64 });
        } catch (err) {
          vscode.postMessage({ type: 'saveData', data: '' });
        }
      }
    });

    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`;
  }
}
