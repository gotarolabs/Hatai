import * as vscode from 'vscode';
import { detectSecrets, DetectorConfig } from '../core/detector';
import { redact } from '../core/redactor';
import { AuditLogEntry } from '../sidebar/auditLogProvider';

export function registerCopySafeCommand(
    context: vscode.ExtensionContext,
    detectorConfig: DetectorConfig,
    onAuditEntry: (entry: AuditLogEntry) => void,
): vscode.Disposable {
    return vscode.commands.registerCommand('hatai.copySafe', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('Hatai: Open a file first.');
            return;
        }

        const selection = editor.selection;
        const text = selection.isEmpty
            ? editor.document.getText()
            : editor.document.getText(selection);

        const matches = detectSecrets(text, detectorConfig);

        if (matches.length === 0) {
            await vscode.env.clipboard.writeText(text);
            vscode.window.showInformationMessage('Hatai: ✅ Copied — no secrets found.');
            return;
        }

        const allowCopy = vscode.workspace.getConfiguration('hatai').get<boolean>('allowUserCopySecrets', false);

        if (!allowCopy) {
            const redacted = redact(text, matches, 'placeholder');
            await vscode.env.clipboard.writeText(redacted);
            vscode.window.showWarningMessage(`Hatai: 🛡️ Security Policy: Secrets were redacted during copy.`);
        } else {
            await vscode.env.clipboard.writeText(text);
            vscode.window.showInformationMessage(`Hatai: ✅ Secrets copied (Security Policy: ALLOWED)`);
        }

        onAuditEntry({
            timestamp: Date.now(),
            fileName: editor.document.fileName,
            secretCount: matches.length,
            action: 'copySafe',
        });
    });
}
