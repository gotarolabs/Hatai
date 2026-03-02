"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogProvider = void 0;
const vscode = require("vscode");
class AuditLogItem extends vscode.TreeItem {
    constructor(entry) {
        const time = new Date(entry.timestamp).toLocaleTimeString();
        const basename = entry.fileName.split(/[\\/]/).pop() ?? entry.fileName;
        const label = `${time} — ${entry.action}`;
        super(label, vscode.TreeItemCollapsibleState.None);
        this.entry = entry;
        this.description = `${basename} · ${entry.secretCount} secret(s)`;
        this.tooltip = new vscode.MarkdownString(`**Action**: ${entry.action}\n\n` +
            `**File**: \`${entry.fileName}\`\n\n` +
            `**Secrets**: ${entry.secretCount}\n\n` +
            `**Time**: ${new Date(entry.timestamp).toLocaleString()}`);
        switch (entry.action) {
            case 'scan':
                this.iconPath = new vscode.ThemeIcon('search', new vscode.ThemeColor('charts.blue'));
                break;
            case 'copyForAI':
                this.iconPath = new vscode.ThemeIcon('clippy', new vscode.ThemeColor('charts.green'));
                break;
            case 'copySafe':
                this.iconPath = new vscode.ThemeIcon('shield', new vscode.ThemeColor('charts.blue'));
                break;
            case 'buildContext':
                this.iconPath = new vscode.ThemeIcon('files', new vscode.ThemeColor('charts.purple'));
                break;
            case 'redact':
                this.iconPath = new vscode.ThemeIcon('shield', new vscode.ThemeColor('charts.orange'));
                break;
            case 'markSafe':
                this.iconPath = new vscode.ThemeIcon('pass', new vscode.ThemeColor('charts.green'));
                break;
        }
    }
}
class AuditLogProvider {
    constructor(workspaceState) {
        this.workspaceState = workspaceState;
        this.entries = [];
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        const persisted = workspaceState.get('hatai.auditLog');
        if (persisted) {
            this.entries = persisted;
        }
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(_element) {
        return [...this.entries]
            .reverse()
            .map((entry) => new AuditLogItem(entry));
    }
    addEntry(entry) {
        this.entries.push(entry);
        this.persist();
        this._onDidChangeTreeData.fire();
    }
    clearLog() {
        this.entries = [];
        this.persist();
        this._onDidChangeTreeData.fire();
    }
    getEntries() {
        return this.entries;
    }
    persist() {
        void this.workspaceState.update('hatai.auditLog', this.entries);
    }
}
exports.AuditLogProvider = AuditLogProvider;
//# sourceMappingURL=auditLogProvider.js.map