"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIAGNOSTIC_COLLECTION_NAME = void 0;
exports.updateDiagnostics = updateDiagnostics;
exports.clearDiagnostics = clearDiagnostics;
const vscode = require("vscode");
exports.DIAGNOSTIC_COLLECTION_NAME = 'hatai';
function mapSeverity(severity) {
    switch (severity) {
        case 'critical':
            return vscode.DiagnosticSeverity.Error;
        case 'high':
            return vscode.DiagnosticSeverity.Warning;
        case 'medium':
            return vscode.DiagnosticSeverity.Information;
    }
}
function updateDiagnostics(document, matches, collection) {
    const diagnostics = [];
    for (const match of matches) {
        const startPos = document.positionAt(match.start);
        const endPos = document.positionAt(match.end);
        const range = new vscode.Range(startPos, endPos);
        const entropyLabel = match.entropy.toFixed(2);
        const message = `[${match.severity.toUpperCase()}] Potential ${match.type} detected ` +
            `(entropy: ${entropyLabel}). Redact before sharing.`;
        const diagnostic = new vscode.Diagnostic(range, message, mapSeverity(match.severity));
        diagnostic.code = match.patternId;
        diagnostic.source = 'Hatai';
        diagnostics.push(diagnostic);
    }
    collection.set(document.uri, diagnostics);
}
function clearDiagnostics(document, collection) {
    collection.delete(document.uri);
}
//# sourceMappingURL=diagnostics.js.map