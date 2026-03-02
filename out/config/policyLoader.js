"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPolicy = loadPolicy;
exports.policyPatternsToDefinitions = policyPatternsToDefinitions;
exports.watchPolicyFile = watchPolicyFile;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
function loadPolicy() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        return undefined;
    }
    const policyPath = path.join(workspaceFolders[0].uri.fsPath, '.hatai.json');
    if (!fs.existsSync(policyPath)) {
        return undefined;
    }
    try {
        const raw = fs.readFileSync(policyPath, 'utf-8');
        return JSON.parse(raw);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        vscode.window.showWarningMessage(`Hatai: Failed to parse .hatai.json — ${message}`);
        return undefined;
    }
}
function policyPatternsToDefinitions(policy) {
    if (!policy.customPatterns) {
        return [];
    }
    return policy.customPatterns.map((p) => ({
        id: p.id,
        type: p.type,
        pattern: new RegExp(p.pattern, 'g'),
        severity: p.severity,
        description: p.description,
    }));
}
function watchPolicyFile(onReload) {
    const watcher = vscode.workspace.createFileSystemWatcher('**/.hatai.json');
    const reload = () => onReload(loadPolicy());
    watcher.onDidCreate(reload);
    watcher.onDidChange(reload);
    watcher.onDidDelete(() => onReload(undefined));
    return watcher;
}
//# sourceMappingURL=policyLoader.js.map