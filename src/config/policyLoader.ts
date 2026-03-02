import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { PatternDefinition, PatternSeverity } from '../core/patterns';
import { RedactStrategy } from '../core/redactor';

export interface TeamPolicy {
    version?: string;
    teamName?: string;
    customPatterns?: PolicyPatternEntry[];
    whitelist?: string[];
    redactStrategy?: RedactStrategy;
    ignoredFiles?: string[];
}

interface PolicyPatternEntry {
    id: string;
    type: string;
    pattern: string; // regex string (not a RegExp object in JSON)
    severity: PatternSeverity;
    description: string;
}

export function loadPolicy(): TeamPolicy | undefined {
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
        return JSON.parse(raw) as TeamPolicy;
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        vscode.window.showWarningMessage(
            `Hatai: Failed to parse .hatai.json — ${message}`,
        );
        return undefined;
    }
}

export function policyPatternsToDefinitions(policy: TeamPolicy): PatternDefinition[] {
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

export function watchPolicyFile(
    onReload: (policy: TeamPolicy | undefined) => void,
): vscode.Disposable {
    const watcher = vscode.workspace.createFileSystemWatcher('**/.hatai.json');

    const reload = () => onReload(loadPolicy());

    watcher.onDidCreate(reload);
    watcher.onDidChange(reload);
    watcher.onDidDelete(() => onReload(undefined));

    return watcher;
}
