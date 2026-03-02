import * as vscode from 'vscode';
import * as path from 'path';
import * as crypto from 'crypto';
import { renderDashboardHtml, DashboardData } from './dashboardRenderer';
import { AuditLogEntry } from './auditLogProvider';

interface DashboardMessage {
    command: string;
    value?: boolean;
}

export class DashboardProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'hatai.dashboard';

    private view: vscode.WebviewView | undefined;
    private secureCopyEnabled: boolean;

    constructor(
        private readonly extensionUri: vscode.Uri,
        private readonly workspaceState: vscode.Memento,
        private readonly getEntries: () => readonly AuditLogEntry[],
    ) {
        this.secureCopyEnabled = this.workspaceState.get<boolean>('hatai.secureCopyEnabled', true);
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ): void {
        this.view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri],
        };

        webviewView.webview.html = this.getHtmlContent(webviewView.webview);

        webviewView.webview.onDidReceiveMessage((message: DashboardMessage) => {
            if (message.command === 'toggleSecureCopy' && typeof message.value === 'boolean') {
                this.secureCopyEnabled = message.value;
                void this.workspaceState.update('hatai.secureCopyEnabled', message.value);
                vscode.window.showInformationMessage(
                    message.value
                        ? '🔒 Hatai: Secure Copy Enabled'
                        : '🔓 Hatai: Secure Copy Disabled',
                );
            }

            if (message.command === 'ready') {
                this.pushStats();
                this.pushTimeline();
                this.pushToggleState();
            }
        });

        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                this.refresh();
            }
        });
    }

    public isSecureCopyEnabled(): boolean {
        return this.secureCopyEnabled;
    }

    public refresh(): void {
        if (!this.view) { return; }
        this.view.webview.html = this.getHtmlContent(this.view.webview);
    }

    public pushStats(): void {
        if (!this.view) { return; }

        const entries = this.getEntries();
        const data = this.buildStatsData(entries);

        void this.view.webview.postMessage({
            command: 'updateStats',
            data,
        });
    }

    public pushTimeline(): void {
        if (!this.view) { return; }

        const entries = this.getEntries();
        const recent = [...entries].reverse().slice(0, 15);

        void this.view.webview.postMessage({
            command: 'updateTimeline',
            entries: recent,
        });
    }

    private pushToggleState(): void {
        if (!this.view) { return; }
        void this.view.webview.postMessage({
            command: 'setToggle',
            value: this.secureCopyEnabled,
        });
    }

    private buildStatsData(entries: readonly AuditLogEntry[]): DashboardData {
        let totalSecrets = 0;
        let protectedCopies = 0;
        let lastScanTime = '';

        for (const entry of entries) {
            totalSecrets += entry.secretCount;

            if (entry.action === 'copyForAI' || entry.action === 'copySafe') {
                protectedCopies++;
            }

            if (entry.action === 'scan') {
                lastScanTime = new Date(entry.timestamp).toLocaleTimeString();
            }
        }

        const avgEntropy = entries.length > 0 ? totalSecrets / entries.length : 0;

        return {
            totalSecrets,
            protectedCopies,
            avgEntropy: Math.round(avgEntropy * 100) / 100,
            lastScanTime: lastScanTime || 'Never',
            secureCopyEnabled: this.secureCopyEnabled,
        };
    }

    private getHtmlContent(webview: vscode.Webview): string {
        const nonce = crypto.randomBytes(16).toString('hex');

        const webviewsPath = path.join(this.extensionUri.fsPath, 'webviews', 'dashboard');
        const xmlPath = path.join(webviewsPath, 'dashboard.xml');

        const cssUri = webview.asWebviewUri(
            vscode.Uri.file(path.join(webviewsPath, 'dashboard.css')),
        ).toString();

        const jsUri = webview.asWebviewUri(
            vscode.Uri.file(path.join(webviewsPath, 'dashboard.js')),
        ).toString();

        const fontUri = webview.asWebviewUri(
            vscode.Uri.file(path.join(webviewsPath, 'fonts', 'Orbitron-Variable.ttf')),
        ).toString();

        const entries = this.getEntries();
        const data = this.buildStatsData(entries);

        let html = renderDashboardHtml(xmlPath, cssUri, jsUri, fontUri, nonce, data);

        html = html.replace('{{fontUri}}', fontUri);

        return html;
    }
}
