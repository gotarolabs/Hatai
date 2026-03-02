"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCopyForAICommand = registerCopyForAICommand;
const vscode = require("vscode");
const detector_1 = require("../core/detector");
const redactor_1 = require("../core/redactor");
function registerCopyForAICommand(context, detectorConfig, onAuditEntry) {
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
        const matches = (0, detector_1.detectSecrets)(text, detectorConfig);
        if (matches.length === 0) {
            await vscode.env.clipboard.writeText(text);
            vscode.window.showInformationMessage('Hatai: ✅ Copied — no secrets found.');
            return;
        }
        const allowRead = vscode.workspace.getConfiguration('hatai').get('allowAIReadSecrets', false);
        let result = text;
        let summaryLabel = '!!! VISIBLE !!!';
        let statusMsg = `Copied (${matches.length} secret(s) included)`;
        if (!allowRead) {
            result = (0, redactor_1.redact)(text, matches, 'placeholder');
            summaryLabel = 'REDACTED';
            statusMsg = `Copied (${matches.length} secret(s) redacted)`;
        }
        const typeCounts = new Map();
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
//# sourceMappingURL=copyForAI.js.map