import * as vscode from 'vscode';
import { SecretMatch } from '../core/detector';

export class HataiHoverProvider implements vscode.HoverProvider {
    private matchesByUri = new Map<string, SecretMatch[]>();

    public updateMatches(uri: vscode.Uri, matches: SecretMatch[]): void {
        this.matchesByUri.set(uri.toString(), matches);
    }

    public clearMatches(uri: vscode.Uri): void {
        this.matchesByUri.delete(uri.toString());
    }

    public provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        _token: vscode.CancellationToken,
    ): vscode.Hover | undefined {
        const matches = this.matchesByUri.get(document.uri.toString());
        if (!matches || matches.length === 0) {
            return undefined;
        }

        const offset = document.offsetAt(position);
        const match = matches.find((m) => offset >= m.start && offset < m.end);

        if (!match) {
            return undefined;
        }

        const md = new vscode.MarkdownString();
        md.isTrusted = true;
        md.supportThemeIcons = true;

        const severityIcon =
            match.severity === 'critical' ? '🔴' :
                match.severity === 'high' ? '🟠' : '🟡';

        md.appendMarkdown(`### $(shield) Hatai Secret Detected\n\n`);
        md.appendMarkdown(`| Property | Value |\n|---|---|\n`);
        md.appendMarkdown(`| **Type** | \`${match.type}\` |\n`);
        md.appendMarkdown(`| **Severity** | ${severityIcon} ${match.severity.toUpperCase()} |\n`);
        md.appendMarkdown(`| **Pattern** | \`${match.patternId}\` |\n`);
        md.appendMarkdown(`| **Preview** | \`${match.redactedValue}\` |\n`);

        const entropyPct = Math.min(match.entropy / 5, 1);
        const filled = Math.round(entropyPct * 10);
        const empty = 10 - filled;
        const bar = '█'.repeat(filled) + '░'.repeat(empty);
        md.appendMarkdown(`| **Entropy** | \`${bar}\` ${match.entropy.toFixed(2)} bits |\n\n`);

        md.appendMarkdown(
            `---\n\n$(warning) **Never share this value with AI tools or public channels.**\n\n` +
            `Use *Copy for AI* (right-click) to get a safely redacted version.`,
        );

        const range = new vscode.Range(
            document.positionAt(match.start),
            document.positionAt(match.end),
        );

        return new vscode.Hover(md, range);
    }
}
