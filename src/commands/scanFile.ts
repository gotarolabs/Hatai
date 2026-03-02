import * as vscode from 'vscode';
import { detectSecrets, DetectorConfig } from '../core/detector';
import { redact } from '../core/redactor';
import { updateDiagnostics } from '../editor/diagnostics';
import { AuditLogEntry } from '../sidebar/auditLogProvider';

export function registerScanFileCommand(
    context: vscode.ExtensionContext,
    diagnosticCollection: vscode.DiagnosticCollection,
    detectorConfig: DetectorConfig,
    onAuditEntry: (entry: AuditLogEntry) => void,
): vscode.Disposable {
    return vscode.commands.registerCommand('hatai.scanFile', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('Hatai: Open a file to scan.');
            return;
        }

        const text = editor.document.getText();
        const matches = detectSecrets(text, detectorConfig);

        updateDiagnostics(editor.document, matches, diagnosticCollection);

        if (matches.length === 0) {
            vscode.window.showInformationMessage('Hatai: ✅ No secrets found in this file.');
            onAuditEntry({
                timestamp: Date.now(),
                fileName: editor.document.fileName,
                secretCount: 0,
                action: 'scan',
            });
            return;
        }

        vscode.window.showWarningMessage(
            `Hatai: ⚠️ Found ${matches.length} potential secret(s).`,
        );

        const redactedText = redact(text, matches, 'placeholder');

        const header =
            `// ── Hatai Scan Results ──\n` +
            `// File: ${editor.document.fileName}\n` +
            `// Secrets found: ${matches.length}\n` +
            `// Strategy: placeholder\n` +
            `// ─────────────────────────────\n\n`;

        const doc = await vscode.workspace.openTextDocument({
            content: header + redactedText,
            language: editor.document.languageId,
        });
        await vscode.window.showTextDocument(doc, { preview: true, viewColumn: vscode.ViewColumn.Beside });

        onAuditEntry({
            timestamp: Date.now(),
            fileName: editor.document.fileName,
            secretCount: matches.length,
            action: 'scan',
        });
    });
}
