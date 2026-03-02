import * as vscode from 'vscode';
import { AuditLogEntry } from './auditLogProvider';

export class StatsProvider {
    private panel: vscode.WebviewPanel | undefined;

    constructor(private readonly getEntries: () => readonly AuditLogEntry[]) { }

    public show(): void {
        if (this.panel) {
            this.panel.reveal();
            this.refresh();
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            'hataiStats',
            '🛡️ Hatai Dashboard',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            },
        );

        this.panel.webview.onDidReceiveMessage(async (message) => {
            const config = vscode.workspace.getConfiguration('hatai');
            switch (message.command) {
                case 'toggleSetting':
                    await config.update(message.key, message.value, vscode.ConfigurationTarget.Global);
                    break;
                case 'exportAuditLog':
                    this.exportLog();
                    break;
            }
        });

        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });

        this.refresh();
    }

    public refresh(): void {
        if (!this.panel) {
            return;
        }
        this.panel.webview.html = this.buildHtml();
    }

    private async exportLog() {
        const entries = this.getEntries();
        const content = JSON.stringify(entries, null, 2);
        const doc = await vscode.workspace.openTextDocument({
            content,
            language: 'json'
        });
        await vscode.window.showTextDocument(doc);
    }

    private buildHtml(): string {
        const entries = this.getEntries();
        const config = vscode.workspace.getConfiguration('hatai');

        const allowAIRead = config.get<boolean>('allowAIReadSecrets', false);
        const allowUserCopy = config.get<boolean>('allowUserCopySecrets', false);

        const totalSecrets = entries.reduce((sum, e) => sum + e.secretCount, 0);
        const totalActions = entries.length;
        const redactions = entries.filter(e => e.action === 'redact' || (e.action === 'copyForAI' && !allowAIRead)).length;
        const aiCopies = entries.filter(e => e.action === 'copyForAI').length;

        const recent = [...entries].reverse().slice(0, 20);

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1.0">
    <title>Hatai Dashboard</title>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Inter:wght@300;400;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-dark: #020617;
            --glass-bg: rgba(15, 23, 42, 0.8);
            --glass-border: rgba(255, 255, 255, 0.08);
            --primary: #38bdf8;
            --primary-glow: rgba(56, 189, 248, 0.3);
            --danger: #ef4444;
            --warning: #f59e0b;
            --success: #10b981;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
        }

        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--bg-dark);
            color: var(--text-main);
            margin: 0;
            padding: 24px;
            overflow-x: hidden;
            background-image: 
                radial-gradient(circle at 10% 10%, rgba(56, 189, 248, 0.05) 0%, transparent 40%),
                radial-gradient(circle at 90% 90%, rgba(168, 85, 247, 0.05) 0%, transparent 40%);
        }

        .container {
            max-width: 1000px;
            margin: 0 auto;
        }

        /* --- Header --- */
        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 40px;
        }

        .logo-section {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .logo-icon {
            font-size: 32px;
            filter: drop-shadow(0 0 10px var(--primary));
        }

        h1 {
            font-family: 'Orbitron', sans-serif;
            font-size: 28px;
            letter-spacing: 2px;
            margin: 0;
            background: linear-gradient(90deg, #38bdf8, #a855f7);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .status-badge {
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid var(--success);
            color: var(--success);
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .pulse {
            width: 8px;
            height: 8px;
            background: var(--success);
            border-radius: 50%;
            animation: pulse-ring 2s infinite;
        }

        @keyframes pulse-ring {
            0% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
            70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
            100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }

        /* --- Stats Grid --- */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }

        .stat-card {
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            padding: 24px;
            border-radius: 16px;
            backdrop-filter: blur(12px);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
        }

        .stat-card:hover {
            transform: translateY(-5px);
            border-color: var(--primary);
            box-shadow: 0 10px 30px -10px var(--primary-glow);
        }

        .stat-card::after {
            content: '';
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            background: linear-gradient(45deg, transparent, rgba(255,255,255,0.03), transparent);
            transform: translateX(-100%);
            transition: 0.5s;
        }

        .stat-card:hover::after { transform: translateX(100%); }

        .stat-value {
            font-family: 'Orbitron', sans-serif;
            font-size: 36px;
            font-weight: 700;
            margin-bottom: 4px;
            color: var(--primary);
        }

        .stat-label {
            color: var(--text-muted);
            font-size: 0.85em;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        /* --- Policy Controls --- */
        .policy-panel {
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            padding: 24px;
            border-radius: 16px;
            margin-bottom: 40px;
        }

        .policy-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        .policy-title {
            font-family: 'Orbitron', sans-serif;
            font-size: 18px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .toggle-group {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }

        .toggle-item {
            background: rgba(255,255,255,0.02);
            padding: 16px;
            border-radius: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border: 1px solid transparent;
            transition: 0.2s;
        }

        .toggle-item:hover {
            background: rgba(255,255,255,0.04);
            border-color: var(--glass-border);
        }

        .toggle-info h4 { margin: 0 0 4px 0; font-size: 0.95em; }
        .toggle-info p { margin: 0; font-size: 0.8em; color: var(--text-muted); }

        /* Custom Toggle Switch */
        .switch {
            position: relative;
            display: inline-block;
            width: 44px;
            height: 24px;
        }

        .switch input { opacity: 0; width: 0; height: 0; }

        .slider {
            position: absolute;
            cursor: pointer;
            top: 0; left: 0; right: 0; bottom: 0;
            background-color: #334155;
            transition: .4s;
            border-radius: 24px;
        }

        .slider:before {
            position: absolute;
            content: "";
            height: 18px; width: 18px;
            left: 3px; bottom: 3px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
        }

        input:checked + .slider { background-color: var(--primary); }
        input:checked + .slider:before { transform: translateX(20px); }

        /* --- Timeline --- */
        .timeline-section {
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            border-radius: 16px;
            padding: 24px;
        }

        .timeline-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        .filter-group {
            display: flex;
            gap: 12px;
        }

        .btn-mini {
            background: var(--glass-border);
            border: 1px solid var(--glass-border);
            color: var(--text-muted);
            padding: 4px 12px;
            border-radius: 6px;
            font-size: 0.75em;
            cursor: pointer;
            transition: 0.2s;
        }

        .btn-mini:hover, .btn-mini.active {
            background: var(--primary);
            color: var(--bg-dark);
            border-color: var(--primary);
            font-weight: 600;
        }

        .timeline {
            max-height: 400px;
            overflow-y: auto;
            padding-right: 8px;
        }

        .timeline::-webkit-scrollbar { width: 6px; }
        .timeline::-webkit-scrollbar-thumb { background: var(--glass-border); border-radius: 10px; }

        .event-card {
            background: rgba(255,255,255,0.02);
            padding: 12px 16px;
            border-radius: 10px;
            margin-bottom: 12px;
            display: grid;
            grid-template-columns: 80px 100px 1fr 60px;
            align-items: center;
            font-size: 0.85em;
            border-left: 3px solid transparent;
            animation: slide-in 0.4s ease-out forwards;
        }

        @keyframes slide-in {
            from { opacity: 0; transform: translateX(20px); }
            to { opacity: 1; transform: translateX(0); }
        }

        .event-card.redact { border-left-color: var(--danger); }
        .event-card.copyForAI { border-left-color: var(--primary); }
        .event-card.scan { border-left-color: var(--text-muted); }

        .event-time { color: var(--text-muted); }
        .event-action { font-weight: 600; text-transform: uppercase; font-size: 0.8em; }
        .event-file { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0 16px; }
        .event-count { text-align: right; color: var(--primary); font-weight: 700; }

        .export-btn {
            background: transparent;
            border: 1px solid var(--primary);
            color: var(--primary);
            padding: 8px 16px;
            border-radius: 8px;
            font-family: 'Orbitron', sans-serif;
            font-size: 0.8em;
            cursor: pointer;
            transition: 0.3s;
            margin-top: 20px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .export-btn:hover {
            background: var(--primary);
            color: var(--bg-dark);
            box-shadow: 0 0 15px var(--primary-glow);
        }

    </style>
</head>
<body>
    <div class="container">
        <header>
            <div class="logo-section">
                <span class="logo-icon">🛡️</span>
                <h1>HATAI</h1>
            </div>
            <div class="status-badge">
                <div class="pulse"></div>
                LIVE SCANNING ENABLED
            </div>
        </header>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value" id="count-secrets">${totalSecrets}</div>
                <div class="stat-label">Secrets Detected</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="count-redactions">${redactions}</div>
                <div class="stat-label">Security Redactions</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="count-copies">${aiCopies}</div>
                <div class="stat-label">AI-Safe Copies</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="count-actions">${totalActions}</div>
                <div class="stat-label">Total Actions</div>
            </div>
        </div>

        <div class="policy-panel">
            <div class="policy-header">
                <div class="policy-title">⚙️ SECURITY POLICIES</div>
            </div>
            <div class="toggle-group">
                <div class="toggle-item">
                    <div class="toggle-info">
                        <h4>Allow AI to Read Secrets</h4>
                        <p>Disable to force redaction during AI copies.</p>
                    </div>
                    <label class="switch">
                        <input type="checkbox" id="toggle-ai" ${allowAIRead ? 'checked' : ''} onchange="updatePolicy('allowAIReadSecrets', this.checked)">
                        <span class="slider"></span>
                    </label>
                </div>
                <div class="toggle-item">
                    <div class="toggle-info">
                        <h4>Allow User to Copy Secrets</h4>
                        <p>Disable to redact secrets in all local copies.</p>
                    </div>
                    <label class="switch">
                        <input type="checkbox" id="toggle-user" ${allowUserCopy ? 'checked' : ''} onchange="updatePolicy('allowUserCopySecrets', this.checked)">
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
        </div>

        <div class="timeline-section">
            <div class="timeline-header">
                <div class="policy-title">🕒 RECENT ACTIVITY</div>
                <div class="filter-group">
                    <button class="btn-mini active" onclick="filterEvents('all')">ALL</button>
                    <button class="btn-mini" onclick="filterEvents('redact')">REDACTIONS</button>
                    <button class="btn-mini" onclick="filterEvents('copyForAI')">AI COPIES</button>
                </div>
            </div>
            <div class="timeline" id="timeline-container">
                ${recent.map((e, i) => `
                    <div class="event-card ${e.action}" data-action="${e.action}" style="animation-delay: ${i * 0.05}s">
                        <div class="event-time">${new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        <div class="event-action">${e.action}</div>
                        <div class="event-file" title="${e.fileName}">${e.fileName.split(/[\\/]/).pop()}</div>
                        <div class="event-count">${e.secretCount > 0 ? '🔒 ' + e.secretCount : '✅'}</div>
                    </div>
                `).join('')}
                ${recent.length === 0 ? '<p style="color:var(--text-muted); text-align:center;">No activity logged yet.</p>' : ''}
            </div>
            <button class="export-btn" onclick="exportLog()">
                <span>📄</span> EXPORT AUDIT LOG
            </button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function updatePolicy(key, value) {
            vscode.postMessage({
                command: 'toggleSetting',
                key: key,
                value: value
            });
        }

        function exportLog() {
            vscode.postMessage({ command: 'exportAuditLog' });
        }

        function filterEvents(type) {
            const cards = document.querySelectorAll('.event-card');
            const btns = document.querySelectorAll('.btn-mini');
            
            btns.forEach(b => b.classList.remove('active'));
            event.target.classList.add('active');

            cards.forEach(card => {
                if (type === 'all' || card.dataset.action === type) {
                    card.style.display = 'grid';
                } else {
                    card.style.display = 'none';
                }
            });
        }

        // Animate counters
        function animateValue(obj, start, end, duration) {
            let startTimestamp = null;
            const step = (timestamp) => {
                if (!startTimestamp) startTimestamp = timestamp;
                const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                obj.innerHTML = Math.floor(progress * (end - start) + start);
                if (progress < 1) {
                    window.requestAnimationFrame(step);
                }
            };
            window.requestAnimationFrame(step);
        }

        window.addEventListener('load', () => {
            const counters = [
                { id: 'count-secrets', val: ${totalSecrets} },
                { id: 'count-redactions', val: ${redactions} },
                { id: 'count-copies', val: ${aiCopies} },
                { id: 'count-actions', val: ${totalActions} }
            ];
            counters.forEach(c => {
                const el = document.getElementById(c.id);
                if (el) animateValue(el, 0, c.val, 1000);
            });
        });
    </script>
</body>
</html>`;
    }
}
