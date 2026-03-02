import * as vscode from 'vscode';
import { SecretMatch } from '../core/detector';

export const DIAGNOSTIC_COLLECTION_NAME = 'hatai';

function mapSeverity(severity: SecretMatch['severity']): vscode.DiagnosticSeverity {
    switch (severity) {
        case 'critical':
            return vscode.DiagnosticSeverity.Error;
        case 'high':
            return vscode.DiagnosticSeverity.Warning;
        case 'medium':
            return vscode.DiagnosticSeverity.Information;
    }
}

export function updateDiagnostics(
    document: vscode.TextDocument,
    matches: SecretMatch[],
    collection: vscode.DiagnosticCollection,
): void {
    const diagnostics: vscode.Diagnostic[] = [];

    for (const match of matches) {
        const startPos = document.positionAt(match.start);
        const endPos = document.positionAt(match.end);
        const range = new vscode.Range(startPos, endPos);

        const entropyLabel = match.entropy.toFixed(2);
        const message =
            `[${match.severity.toUpperCase()}] Potential ${match.type} detected ` +
            `(entropy: ${entropyLabel}). Redact before sharing.`;

        const diagnostic = new vscode.Diagnostic(range, message, mapSeverity(match.severity));
        diagnostic.code = match.patternId;
        diagnostic.source = 'Hatai';

        diagnostics.push(diagnostic);
    }

    collection.set(document.uri, diagnostics);
}

export function clearDiagnostics(
    document: vscode.TextDocument,
    collection: vscode.DiagnosticCollection,
): void {
    collection.delete(document.uri);
}
