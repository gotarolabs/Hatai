"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerScanFileCommand = registerScanFileCommand;
const vscode = require("vscode");
const detector_1 = require("../core/detector");
const redactor_1 = require("../core/redactor");
const diagnostics_1 = require("../editor/diagnostics");
function registerScanFileCommand(context, diagnosticCollection, detectorConfig, onAuditEntry) {
    return vscode.commands.registerCommand('hatai.scanFile', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('Hatai: Open a file to scan.');
            return;
        }
        const text = editor.document.getText();
        const matches = (0, detector_1.detectSecrets)(text, detectorConfig);
        (0, diagnostics_1.updateDiagnostics)(editor.document, matches, diagnosticCollection);
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
        vscode.window.showWarningMessage(`Hatai: ⚠️ Found ${matches.length} potential secret(s).`);
        const redactedText = (0, redactor_1.redact)(text, matches, 'placeholder');
        const header = `// ── Hatai Scan Results ──\n` +
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
//# sourceMappingURL=scanFile.js.map