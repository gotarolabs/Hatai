import * as vscode from 'vscode';
import { SecretMatch } from '../core/detector';

const criticalDecoration = vscode.window.createTextEditorDecorationType({
    gutterIconPath: new vscode.ThemeIcon('error').id ? undefined : undefined,
    gutterIconSize: 'contain',
    overviewRulerColor: '#ff1744',
    overviewRulerLane: vscode.OverviewRulerLane.Right,
    backgroundColor: 'rgba(255, 23, 68, 0.08)',
    border: '1px solid rgba(255, 23, 68, 0.4)',
    borderRadius: '2px',
    after: {
        contentText: ' 🔴',
        margin: '0 0 0 4px',
    },
});

const highDecoration = vscode.window.createTextEditorDecorationType({
    overviewRulerColor: '#ff9100',
    overviewRulerLane: vscode.OverviewRulerLane.Right,
    backgroundColor: 'rgba(255, 145, 0, 0.08)',
    border: '1px solid rgba(255, 145, 0, 0.4)',
    borderRadius: '2px',
    after: {
        contentText: ' 🟠',
        margin: '0 0 0 4px',
    },
});

const mediumDecoration = vscode.window.createTextEditorDecorationType({
    overviewRulerColor: '#ffd600',
    overviewRulerLane: vscode.OverviewRulerLane.Right,
    backgroundColor: 'rgba(255, 214, 0, 0.06)',
    border: '1px solid rgba(255, 214, 0, 0.35)',
    borderRadius: '2px',
    after: {
        contentText: ' 🟡',
        margin: '0 0 0 4px',
    },
});

export const allDecorationTypes = [criticalDecoration, highDecoration, mediumDecoration];

export function applyDecorations(editor: vscode.TextEditor, matches: SecretMatch[]): void {
    const critical: vscode.DecorationOptions[] = [];
    const high: vscode.DecorationOptions[] = [];
    const medium: vscode.DecorationOptions[] = [];

    for (const match of matches) {
        const startPos = editor.document.positionAt(match.start);
        const endPos = editor.document.positionAt(match.end);
        const range = new vscode.Range(startPos, endPos);

        const option: vscode.DecorationOptions = {
            range,
            hoverMessage: new vscode.MarkdownString(
                `$(shield) **Hatai** — ${match.severity.toUpperCase()} severity\n\n` +
                `Type: \`${match.type}\` · Entropy: \`${match.entropy.toFixed(2)}\``,
            ),
        };

        switch (match.severity) {
            case 'critical':
                critical.push(option);
                break;
            case 'high':
                high.push(option);
                break;
            case 'medium':
                medium.push(option);
                break;
        }
    }

    editor.setDecorations(criticalDecoration, critical);
    editor.setDecorations(highDecoration, high);
    editor.setDecorations(mediumDecoration, medium);
}

export function clearDecorations(editor: vscode.TextEditor): void {
    editor.setDecorations(criticalDecoration, []);
    editor.setDecorations(highDecoration, []);
    editor.setDecorations(mediumDecoration, []);
}
