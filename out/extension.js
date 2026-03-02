"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const detector_1 = require("./core/detector");
const redactor_1 = require("./core/redactor");
const decorations_1 = require("./editor/decorations");
const diagnostics_1 = require("./editor/diagnostics");
const hoverProvider_1 = require("./editor/hoverProvider");
const codelens_1 = require("./editor/codelens");
const copyForAI_1 = require("./commands/copyForAI");
const copySafe_1 = require("./commands/copySafe");
const scanFile_1 = require("./commands/scanFile");
const buildContext_1 = require("./commands/buildContext");
const installGitHook_1 = require("./commands/installGitHook");
const auditLogProvider_1 = require("./sidebar/auditLogProvider");
const statsProvider_1 = require("./sidebar/statsProvider");
const dashboardProvider_1 = require("./sidebar/dashboardProvider");
const settings_1 = require("./config/settings");
const policyLoader_1 = require("./config/policyLoader");
const whitelist_1 = require("./config/whitelist");
let diagnosticCollection;
let hoverProvider;
let codeLensProvider;
let auditLogProvider;
let statsProvider;
let dashboardProvider;
let whitelistStore;
let debounceTimer;
let detectorConfig = {};
function buildDetectorConfig(policy) {
    return {
        customPatterns: policy ? (0, policyLoader_1.policyPatternsToDefinitions)(policy) : [],
        whitelist: policy?.whitelist ?? [],
        entropyThreshold: (0, settings_1.getEntropyThreshold)(),
        ignoredPatternIds: (0, settings_1.getIgnoredPatternIds)(),
    };
}
function scanDocument(document) {
    const text = document.getText();
    const secrets = (0, detector_1.detectSecrets)(text, detectorConfig);
    const filtered = secrets.filter((m) => !whitelistStore.isWhitelisted(m.value));
    (0, diagnostics_1.updateDiagnostics)(document, filtered, diagnosticCollection);
    hoverProvider.updateMatches(document.uri, filtered);
    codeLensProvider.updateMatches(document.uri, filtered);
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.uri.toString() === document.uri.toString()) {
        if ((0, settings_1.showGutterIcons)()) {
            (0, decorations_1.applyDecorations)(editor, filtered);
        }
        else {
            (0, decorations_1.clearDecorations)(editor);
        }
    }
}
function debouncedScan(document) {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => scanDocument(document), 500);
}
function addAuditEntry(entry) {
    auditLogProvider.addEntry(entry);
    statsProvider.refresh();
    dashboardProvider.pushStats();
    dashboardProvider.pushTimeline();
}
function activate(context) {
    diagnosticCollection = vscode.languages.createDiagnosticCollection(diagnostics_1.DIAGNOSTIC_COLLECTION_NAME);
    context.subscriptions.push(diagnosticCollection);
    const policy = (0, policyLoader_1.loadPolicy)();
    detectorConfig = buildDetectorConfig(policy);
    const policyWatcher = (0, policyLoader_1.watchPolicyFile)((newPolicy) => {
        detectorConfig = buildDetectorConfig(newPolicy);
        for (const editor of vscode.window.visibleTextEditors) {
            scanDocument(editor.document);
        }
    });
    context.subscriptions.push(policyWatcher);
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('hatai')) {
            detectorConfig = buildDetectorConfig((0, policyLoader_1.loadPolicy)());
            for (const editor of vscode.window.visibleTextEditors) {
                scanDocument(editor.document);
            }
            statsProvider.refresh();
            dashboardProvider.pushStats();
        }
    }));
    whitelistStore = new whitelist_1.WhitelistStore(context.workspaceState);
    hoverProvider = new hoverProvider_1.HataiHoverProvider();
    context.subscriptions.push(vscode.languages.registerHoverProvider({ scheme: 'file' }, hoverProvider));
    codeLensProvider = new codelens_1.HataiCodeLensProvider();
    context.subscriptions.push(vscode.languages.registerCodeLensProvider({ scheme: 'file' }, codeLensProvider));
    auditLogProvider = new auditLogProvider_1.AuditLogProvider(context.workspaceState);
    context.subscriptions.push(vscode.window.registerTreeDataProvider('hataiAuditLog', auditLogProvider));
    statsProvider = new statsProvider_1.StatsProvider(() => auditLogProvider.getEntries());
    dashboardProvider = new dashboardProvider_1.DashboardProvider(context.extensionUri, context.workspaceState, () => auditLogProvider.getEntries());
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(dashboardProvider_1.DashboardProvider.viewType, dashboardProvider, { webviewOptions: { retainContextWhenHidden: true } }));
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((e) => {
        if ((0, settings_1.isRealTimeScanningEnabled)() && e.document.uri.scheme === 'file') {
            debouncedScan(e.document);
        }
    }));
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((doc) => {
        if ((0, settings_1.isScanOnSaveEnabled)() && doc.uri.scheme === 'file') {
            scanDocument(doc);
        }
    }));
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor && editor.document.uri.scheme === 'file') {
            scanDocument(editor.document);
        }
    }));
    context.subscriptions.push(vscode.workspace.onDidCloseTextDocument((doc) => {
        diagnosticCollection.delete(doc.uri);
        hoverProvider.clearMatches(doc.uri);
        codeLensProvider.clearMatches(doc.uri);
    }));
    context.subscriptions.push((0, copyForAI_1.registerCopyForAICommand)(context, detectorConfig, addAuditEntry));
    context.subscriptions.push((0, copySafe_1.registerCopySafeCommand)(context, detectorConfig, addAuditEntry));
    context.subscriptions.push((0, scanFile_1.registerScanFileCommand)(context, diagnosticCollection, detectorConfig, addAuditEntry));
    context.subscriptions.push((0, buildContext_1.registerBuildContextCommand)(context, detectorConfig, addAuditEntry));
    context.subscriptions.push((0, installGitHook_1.registerInstallGitHookCommand)(context));
    context.subscriptions.push(vscode.commands.registerCommand('hatai.showStats', () => {
        statsProvider.show();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('hatai.clearAuditLog', () => {
        auditLogProvider.clearLog();
        statsProvider.refresh();
        dashboardProvider.pushStats();
        dashboardProvider.pushTimeline();
        vscode.window.showInformationMessage('Hatai: Audit log cleared.');
    }));
    context.subscriptions.push(vscode.commands.registerCommand('hatai.markSafe', (value) => {
        whitelistStore.addToWhitelist(value);
        vscode.window.showInformationMessage('Hatai: ✅ Value marked as safe.');
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            scanDocument(editor.document);
        }
        addAuditEntry({
            timestamp: Date.now(),
            fileName: editor?.document.fileName ?? 'unknown',
            secretCount: 0,
            action: 'markSafe',
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand('hatai.redactLine', async (uri, lineNumber) => {
        const doc = await vscode.workspace.openTextDocument(uri);
        const lineText = doc.lineAt(lineNumber).text;
        const matches = (0, detector_1.detectSecrets)(lineText, detectorConfig);
        if (matches.length === 0) {
            return;
        }
        const strategy = (0, settings_1.getRedactStrategy)();
        const redacted = (0, redactor_1.redact)(lineText, matches, strategy);
        const lineRange = doc.lineAt(lineNumber).range;
        const edit = new vscode.WorkspaceEdit();
        edit.replace(uri, lineRange, redacted);
        await vscode.workspace.applyEdit(edit);
        addAuditEntry({
            timestamp: Date.now(),
            fileName: doc.fileName,
            secretCount: matches.length,
            action: 'redact',
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand('hatai.copyRedactedLine', async (uri, lineNumber) => {
        const doc = await vscode.workspace.openTextDocument(uri);
        const lineText = doc.lineAt(lineNumber).text;
        const matches = (0, detector_1.detectSecrets)(lineText, detectorConfig);
        const redacted = (0, redactor_1.redact)(lineText, matches, 'placeholder');
        await vscode.env.clipboard.writeText(redacted);
        vscode.window.showInformationMessage(`Hatai: ✅ Redacted line copied (${matches.length} secret(s))`);
    }));
    for (const editor of vscode.window.visibleTextEditors) {
        if (editor.document.uri.scheme === 'file') {
            scanDocument(editor.document);
        }
    }
    const hasShownWelcome = context.globalState.get('hatai.welcomeShown');
    if (!hasShownWelcome) {
        vscode.window
            .showInformationMessage('🛡️ Hatai activated! Your secrets are now protected.', 'Open Dashboard')
            .then((choice) => {
            if (choice === 'Open Dashboard') {
                void vscode.commands.executeCommand('hatai.dashboard.focus');
            }
        });
        void context.globalState.update('hatai.welcomeShown', true);
    }
}
function deactivate() {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    for (const editor of vscode.window.visibleTextEditors) {
        (0, decorations_1.clearDecorations)(editor);
    }
    for (const dt of decorations_1.allDecorationTypes) {
        dt.dispose();
    }
}
//# sourceMappingURL=extension.js.map