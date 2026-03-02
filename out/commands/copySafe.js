"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCopySafeCommand = registerCopySafeCommand;
const vscode = require("vscode");
const detector_1 = require("../core/detector");
const redactor_1 = require("../core/redactor");
function registerCopySafeCommand(context, detectorConfig, onAuditEntry) {
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
        const matches = (0, detector_1.detectSecrets)(text, detectorConfig);
        if (matches.length === 0) {
            await vscode.env.clipboard.writeText(text);
            vscode.window.showInformationMessage('Hatai: ✅ Copied — no secrets found.');
            return;
        }
        const allowCopy = vscode.workspace.getConfiguration('hatai').get('allowUserCopySecrets', false);
        if (!allowCopy) {
            const redacted = (0, redactor_1.redact)(text, matches, 'placeholder');
            await vscode.env.clipboard.writeText(redacted);
            vscode.window.showWarningMessage(`Hatai: 🛡️ Security Policy: Secrets were redacted during copy.`);
        }
        else {
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
//# sourceMappingURL=copySafe.js.map