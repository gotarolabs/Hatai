import * as vscode from 'vscode';

import { detectSecrets, SecretMatch, DetectorConfig } from './core/detector';
import { redact, RedactStrategy } from './core/redactor';

import { applyDecorations, clearDecorations, allDecorationTypes } from './editor/decorations';
import { updateDiagnostics, DIAGNOSTIC_COLLECTION_NAME } from './editor/diagnostics';
import { HataiHoverProvider } from './editor/hoverProvider';
import { HataiCodeLensProvider } from './editor/codelens';

import { registerCopyForAICommand } from './commands/copyForAI';
import { registerCopySafeCommand } from './commands/copySafe';
import { registerScanFileCommand } from './commands/scanFile';
import { registerBuildContextCommand } from './commands/buildContext';
import { registerInstallGitHookCommand } from './commands/installGitHook';

import { AuditLogProvider, AuditLogEntry } from './sidebar/auditLogProvider';
import { StatsProvider } from './sidebar/statsProvider';
import { DashboardProvider } from './sidebar/dashboardProvider';

import {
    isRealTimeScanningEnabled,
    isScanOnSaveEnabled,
    getEntropyThreshold,
    getIgnoredPatternIds,
    getRedactStrategy,
    showGutterIcons,
    allowAIReadSecrets,
    allowUserCopySecrets,
} from './config/settings';
import { loadPolicy, policyPatternsToDefinitions, watchPolicyFile, TeamPolicy } from './config/policyLoader';
import { WhitelistStore } from './config/whitelist';

let diagnosticCollection: vscode.DiagnosticCollection;
let hoverProvider: HataiHoverProvider;
let codeLensProvider: HataiCodeLensProvider;
let auditLogProvider: AuditLogProvider;
let statsProvider: StatsProvider;
let dashboardProvider: DashboardProvider;
let whitelistStore: WhitelistStore;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

let detectorConfig: DetectorConfig = {};

function buildDetectorConfig(policy: TeamPolicy | undefined): DetectorConfig {
    return {
        customPatterns: policy ? policyPatternsToDefinitions(policy) : [],
        whitelist: policy?.whitelist ?? [],
        entropyThreshold: getEntropyThreshold(),
        ignoredPatternIds: getIgnoredPatternIds(),
    };
}

function scanDocument(document: vscode.TextDocument): void {
    const text = document.getText();
    const secrets = detectSecrets(text, detectorConfig);

    const filtered = secrets.filter((m) => !whitelistStore.isWhitelisted(m.value));

    updateDiagnostics(document, filtered, diagnosticCollection);

    hoverProvider.updateMatches(document.uri, filtered);
    codeLensProvider.updateMatches(document.uri, filtered);

    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.uri.toString() === document.uri.toString()) {
        if (showGutterIcons()) {
            applyDecorations(editor, filtered);
        } else {
            clearDecorations(editor);
        }
    }
}

function debouncedScan(document: vscode.TextDocument): void {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => scanDocument(document), 500);
}

function addAuditEntry(entry: AuditLogEntry): void {
    auditLogProvider.addEntry(entry);
    statsProvider.refresh();
    dashboardProvider.pushStats();
    dashboardProvider.pushTimeline();
}

export function activate(context: vscode.ExtensionContext): void {
    diagnosticCollection = vscode.languages.createDiagnosticCollection(DIAGNOSTIC_COLLECTION_NAME);
    context.subscriptions.push(diagnosticCollection);

    const policy = loadPolicy();
    detectorConfig = buildDetectorConfig(policy);

    const policyWatcher = watchPolicyFile((newPolicy) => {
        detectorConfig = buildDetectorConfig(newPolicy);
        for (const editor of vscode.window.visibleTextEditors) {
            scanDocument(editor.document);
        }
    });
    context.subscriptions.push(policyWatcher);

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('hatai')) {
                detectorConfig = buildDetectorConfig(loadPolicy());
                for (const editor of vscode.window.visibleTextEditors) {
                    scanDocument(editor.document);
                }
                statsProvider.refresh();
                dashboardProvider.pushStats();
            }
        }),
    );

    whitelistStore = new WhitelistStore(context.workspaceState);

    hoverProvider = new HataiHoverProvider();
    context.subscriptions.push(
        vscode.languages.registerHoverProvider({ scheme: 'file' }, hoverProvider),
    );

    codeLensProvider = new HataiCodeLensProvider();
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider({ scheme: 'file' }, codeLensProvider),
    );

    auditLogProvider = new AuditLogProvider(context.workspaceState);
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('hataiAuditLog', auditLogProvider),
    );

    statsProvider = new StatsProvider(() => auditLogProvider.getEntries());

    dashboardProvider = new DashboardProvider(
        context.extensionUri,
        context.workspaceState,
        () => auditLogProvider.getEntries(),
    );
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            DashboardProvider.viewType,
            dashboardProvider,
            { webviewOptions: { retainContextWhenHidden: true } },
        ),
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument((e) => {
            if (isRealTimeScanningEnabled() && e.document.uri.scheme === 'file') {
                debouncedScan(e.document);
            }
        }),
    );

    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument((doc) => {
            if (isScanOnSaveEnabled() && doc.uri.scheme === 'file') {
                scanDocument(doc);
            }
        }),
    );

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor && editor.document.uri.scheme === 'file') {
                scanDocument(editor.document);
            }
        }),
    );

    context.subscriptions.push(
        vscode.workspace.onDidCloseTextDocument((doc) => {
            diagnosticCollection.delete(doc.uri);
            hoverProvider.clearMatches(doc.uri);
            codeLensProvider.clearMatches(doc.uri);
        }),
    );

    context.subscriptions.push(
        registerCopyForAICommand(context, detectorConfig, addAuditEntry),
    );

    context.subscriptions.push(
        registerCopySafeCommand(context, detectorConfig, addAuditEntry),
    );

    context.subscriptions.push(
        registerScanFileCommand(context, diagnosticCollection, detectorConfig, addAuditEntry),
    );

    context.subscriptions.push(
        registerBuildContextCommand(context, detectorConfig, addAuditEntry),
    );

    context.subscriptions.push(registerInstallGitHookCommand(context));

    context.subscriptions.push(
        vscode.commands.registerCommand('hatai.showStats', () => {
            statsProvider.show();
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('hatai.clearAuditLog', () => {
            auditLogProvider.clearLog();
            statsProvider.refresh();
            dashboardProvider.pushStats();
            dashboardProvider.pushTimeline();
            vscode.window.showInformationMessage('Hatai: Audit log cleared.');
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('hatai.markSafe', (value: string) => {
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
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'hatai.redactLine',
            async (uri: vscode.Uri, lineNumber: number) => {
                const doc = await vscode.workspace.openTextDocument(uri);
                const lineText = doc.lineAt(lineNumber).text;
                const matches = detectSecrets(lineText, detectorConfig);

                if (matches.length === 0) {
                    return;
                }

                const strategy = getRedactStrategy();
                const redacted = redact(lineText, matches, strategy);
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
            },
        ),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'hatai.copyRedactedLine',
            async (uri: vscode.Uri, lineNumber: number) => {
                const doc = await vscode.workspace.openTextDocument(uri);
                const lineText = doc.lineAt(lineNumber).text;
                const matches = detectSecrets(lineText, detectorConfig);
                const redacted = redact(lineText, matches, 'placeholder');

                await vscode.env.clipboard.writeText(redacted);
                vscode.window.showInformationMessage(
                    `Hatai: ✅ Redacted line copied (${matches.length} secret(s))`,
                );
            },
        ),
    );

    for (const editor of vscode.window.visibleTextEditors) {
        if (editor.document.uri.scheme === 'file') {
            scanDocument(editor.document);
        }
    }

    const hasShownWelcome = context.globalState.get<boolean>('hatai.welcomeShown');
    if (!hasShownWelcome) {
        vscode.window
            .showInformationMessage(
                '🛡️ Hatai activated! Your secrets are now protected.',
                'Open Dashboard',
            )
            .then((choice) => {
                if (choice === 'Open Dashboard') {
                    void vscode.commands.executeCommand('hatai.dashboard.focus');
                }
            });
        void context.globalState.update('hatai.welcomeShown', true);
    }
}

export function deactivate(): void {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }

    for (const editor of vscode.window.visibleTextEditors) {
        clearDecorations(editor);
    }

    for (const dt of allDecorationTypes) {
        dt.dispose();
    }
}
