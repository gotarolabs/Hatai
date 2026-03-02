import * as vscode from 'vscode';

export interface AuditLogEntry {
    timestamp: number;
    fileName: string;
    secretCount: number;
    action: 'scan' | 'copyForAI' | 'buildContext' | 'redact' | 'markSafe' | 'copySafe';
}

class AuditLogItem extends vscode.TreeItem {
    constructor(public readonly entry: AuditLogEntry) {
        const time = new Date(entry.timestamp).toLocaleTimeString();
        const basename = entry.fileName.split(/[\\/]/).pop() ?? entry.fileName;
        const label = `${time} — ${entry.action}`;

        super(label, vscode.TreeItemCollapsibleState.None);

        this.description = `${basename} · ${entry.secretCount} secret(s)`;
        this.tooltip = new vscode.MarkdownString(
            `**Action**: ${entry.action}\n\n` +
            `**File**: \`${entry.fileName}\`\n\n` +
            `**Secrets**: ${entry.secretCount}\n\n` +
            `**Time**: ${new Date(entry.timestamp).toLocaleString()}`,
        );

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

export class AuditLogProvider implements vscode.TreeDataProvider<AuditLogItem> {
    private entries: AuditLogEntry[] = [];
    private _onDidChangeTreeData = new vscode.EventEmitter<AuditLogItem | undefined | void>();
    public readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(private readonly workspaceState: vscode.Memento) {
        const persisted = workspaceState.get<AuditLogEntry[]>('hatai.auditLog');
        if (persisted) {
            this.entries = persisted;
        }
    }

    getTreeItem(element: AuditLogItem): vscode.TreeItem {
        return element;
    }

    getChildren(_element?: AuditLogItem): AuditLogItem[] {
        return [...this.entries]
            .reverse()
            .map((entry) => new AuditLogItem(entry));
    }

    public addEntry(entry: AuditLogEntry): void {
        this.entries.push(entry);
        this.persist();
        this._onDidChangeTreeData.fire();
    }

    public clearLog(): void {
        this.entries = [];
        this.persist();
        this._onDidChangeTreeData.fire();
    }

    public getEntries(): readonly AuditLogEntry[] {
        return this.entries;
    }

    private persist(): void {
        void this.workspaceState.update('hatai.auditLog', this.entries);
    }
}
