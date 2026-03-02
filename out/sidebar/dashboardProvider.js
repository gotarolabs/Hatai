"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardProvider = void 0;
const vscode = require("vscode");
const path = require("path");
const crypto = require("crypto");
const dashboardRenderer_1 = require("./dashboardRenderer");
class DashboardProvider {
    constructor(extensionUri, workspaceState, getEntries) {
        this.extensionUri = extensionUri;
        this.workspaceState = workspaceState;
        this.getEntries = getEntries;
        this.secureCopyEnabled = this.workspaceState.get('hatai.secureCopyEnabled', true);
    }
    resolveWebviewView(webviewView, _context, _token) {
        this.view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri],
        };
        webviewView.webview.html = this.getHtmlContent(webviewView.webview);
        webviewView.webview.onDidReceiveMessage((message) => {
            if (message.command === 'toggleSecureCopy' && typeof message.value === 'boolean') {
                this.secureCopyEnabled = message.value;
                void this.workspaceState.update('hatai.secureCopyEnabled', message.value);
                vscode.window.showInformationMessage(message.value
                    ? '🔒 Hatai: Secure Copy Enabled'
                    : '🔓 Hatai: Secure Copy Disabled');
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
    isSecureCopyEnabled() {
        return this.secureCopyEnabled;
    }
    refresh() {
        if (!this.view) {
            return;
        }
        this.view.webview.html = this.getHtmlContent(this.view.webview);
    }
    pushStats() {
        if (!this.view) {
            return;
        }
        const entries = this.getEntries();
        const data = this.buildStatsData(entries);
        void this.view.webview.postMessage({
            command: 'updateStats',
            data,
        });
    }
    pushTimeline() {
        if (!this.view) {
            return;
        }
        const entries = this.getEntries();
        const recent = [...entries].reverse().slice(0, 15);
        void this.view.webview.postMessage({
            command: 'updateTimeline',
            entries: recent,
        });
    }
    pushToggleState() {
        if (!this.view) {
            return;
        }
        void this.view.webview.postMessage({
            command: 'setToggle',
            value: this.secureCopyEnabled,
        });
    }
    buildStatsData(entries) {
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
    getHtmlContent(webview) {
        const nonce = crypto.randomBytes(16).toString('hex');
        const webviewsPath = path.join(this.extensionUri.fsPath, 'webviews', 'dashboard');
        const xmlPath = path.join(webviewsPath, 'dashboard.xml');
        const cssUri = webview.asWebviewUri(vscode.Uri.file(path.join(webviewsPath, 'dashboard.css'))).toString();
        const jsUri = webview.asWebviewUri(vscode.Uri.file(path.join(webviewsPath, 'dashboard.js'))).toString();
        const fontUri = webview.asWebviewUri(vscode.Uri.file(path.join(webviewsPath, 'fonts', 'Orbitron-Variable.ttf'))).toString();
        const entries = this.getEntries();
        const data = this.buildStatsData(entries);
        let html = (0, dashboardRenderer_1.renderDashboardHtml)(xmlPath, cssUri, jsUri, fontUri, nonce, data);
        html = html.replace('{{fontUri}}', fontUri);
        return html;
    }
}
exports.DashboardProvider = DashboardProvider;
DashboardProvider.viewType = 'hatai.dashboard';
//# sourceMappingURL=dashboardProvider.js.map