import * as vscode from 'vscode';
import { detectSecrets, DetectorConfig } from '../core/detector';
import { redact } from '../core/redactor';
import { AuditLogEntry } from '../sidebar/auditLogProvider';

export function registerCopyForAICommand(
    context: vscode.ExtensionContext,
    detectorConfig: DetectorConfig,
    onAuditEntry: (entry: AuditLogEntry) => void,
): vscode.Disposable {
    return vscode.commands.registerCommand('hatai.copyForAI', async () => {
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

        const allowRead = vscode.workspace.getConfiguration('hatai').get<boolean>('allowAIReadSecrets', false);

        let result = text;
        let summaryLabel = '!!! VISIBLE !!!';
        let statusMsg = `Copied (${matches.length} secret(s) included)`;

        if (!allowRead) {
            result = redact(text, matches, 'placeholder');
            summaryLabel = 'REDACTED';
            statusMsg = `Copied (${matches.length} secret(s) redacted)`;
        }

        const typeCounts = new Map<string, number>();
        for (const m of matches) {
            typeCounts.set(m.type, (typeCounts.get(m.type) ?? 0) + 1);
        }
        const breakdown = Array.from(typeCounts.entries())
            .map(([type, count]) => `${count}× ${type}`)
            .join(', ');

        result +=
            `\n\n--- HATAI REDACTION SUMMARY (${summaryLabel}) ---\n` +
            `${matches.length} secret(s) detected: ${breakdown}\n` +
            (allowRead ? `WARNING: Secrets are visible in this copy.\n` : `Safe to share with AI tools.\n`);

        await vscode.env.clipboard.writeText(result);
        vscode.window.showInformationMessage(`Hatai: ✅ ${statusMsg}`);

        onAuditEntry({
            timestamp: Date.now(),
            fileName: editor.document.fileName,
            secretCount: matches.length,
            action: 'copyForAI',
        });
    });
}
