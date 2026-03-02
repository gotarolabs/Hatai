"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HataiCodeLensProvider = void 0;
const vscode = require("vscode");
class HataiCodeLensProvider {
    constructor() {
        this.matchesByUri = new Map();
        this._onDidChangeCodeLenses = new vscode.EventEmitter();
        this.onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;
    }
    updateMatches(uri, matches) {
        this.matchesByUri.set(uri.toString(), matches);
        this._onDidChangeCodeLenses.fire();
    }
    clearMatches(uri) {
        this.matchesByUri.delete(uri.toString());
        this._onDidChangeCodeLenses.fire();
    }
    provideCodeLenses(document, _token) {
        const matches = this.matchesByUri.get(document.uri.toString());
        if (!matches || matches.length === 0) {
            return [];
        }
        const lineMap = new Map();
        for (const match of matches) {
            const line = document.positionAt(match.start).line;
            const group = lineMap.get(line) ?? [];
            group.push(match);
            lineMap.set(line, group);
        }
        const lenses = [];
        for (const [line, lineMatches] of lineMap) {
            const range = new vscode.Range(line, 0, line, 0);
            const firstMatch = lineMatches[0];
            const count = lineMatches.length;
            const label = count > 1 ? `${count} secrets` : firstMatch.type;
            lenses.push(new vscode.CodeLens(range, {
                title: `🔒 Redact (${label})`,
                command: 'hatai.redactLine',
                arguments: [document.uri, line],
                tooltip: 'Replace secret(s) on this line with redacted placeholders',
            }));
            lenses.push(new vscode.CodeLens(range, {
                title: 'Mark as Safe',
                command: 'hatai.markSafe',
                arguments: [firstMatch.value],
                tooltip: 'Add this value to the whitelist (hashed — the raw value is never stored)',
            }));
            lenses.push(new vscode.CodeLens(range, {
                title: 'Copy Redacted',
                command: 'hatai.copyRedactedLine',
                arguments: [document.uri, line],
                tooltip: 'Copy this line with secrets replaced to clipboard',
            }));
        }
        return lenses;
    }
}
exports.HataiCodeLensProvider = HataiCodeLensProvider;
//# sourceMappingURL=codelens.js.map