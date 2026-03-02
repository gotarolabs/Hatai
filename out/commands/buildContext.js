"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerBuildContextCommand = registerBuildContextCommand;
const vscode = require("vscode");
const detector_1 = require("../core/detector");
const redactor_1 = require("../core/redactor");
function registerBuildContextCommand(context, detectorConfig, onAuditEntry) {
    return vscode.commands.registerCommand('hatai.buildContext', async () => {
        const openDocs = vscode.workspace.textDocuments.filter((d) => d.uri.scheme === 'file' && !d.isClosed);
        if (openDocs.length === 0) {
            vscode.window.showInformationMessage('Hatai: No open files to build context from.');
            return;
        }
        const items = openDocs.map((doc) => ({
            label: vscode.workspace.asRelativePath(doc.uri),
            description: doc.languageId,
            uri: doc.uri,
            picked: true,
        }));
        const selected = await vscode.window.showQuickPick(items, {
            canPickMany: true,
            placeHolder: 'Select files to include in the AI-safe context',
            title: 'Hatai: Build Context',
        });
        if (!selected || selected.length === 0) {
            return;
        }
        let combined = '';
        for (const item of selected) {
            const doc = await vscode.workspace.openTextDocument(item.uri);
            const relativePath = vscode.workspace.asRelativePath(item.uri);
            combined += `// ── ${relativePath} ──\n${doc.getText()}\n\n`;
        }
        const matches = (0, detector_1.detectSecrets)(combined, detectorConfig);
        let result = (0, redactor_1.redact)(combined, matches, 'placeholder');
        if (matches.length > 0) {
            const typeCounts = new Map();
            for (const m of matches) {
                typeCounts.set(m.type, (typeCounts.get(m.type) ?? 0) + 1);
            }
            const breakdown = Array.from(typeCounts.entries())
                .map(([type, count]) => `${count}× ${type}`)
                .join(', ');
            result +=
                `\n--- HATAI REDACTION SUMMARY ---\n` +
                    `Files included: ${selected.length}\n` +
                    `${matches.length} secret(s) redacted: ${breakdown}\n` +
                    `Safe to share with AI tools.\n`;
        }
        else {
            result +=
                `\n--- HATAI CONTEXT SUMMARY ---\n` +
                    `Files included: ${selected.length}\n` +
                    `No secrets found. Safe to share.\n`;
        }
        await vscode.env.clipboard.writeText(result);
        vscode.window.showInformationMessage(`Hatai: ✅ Context copied (${selected.length} files, ${matches.length} secret(s) redacted)`);
        onAuditEntry({
            timestamp: Date.now(),
            fileName: `${selected.length} files`,
            secretCount: matches.length,
            action: 'buildContext',
        });
    });
}
//# sourceMappingURL=buildContext.js.map