import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const PRE_COMMIT_SCRIPT = `#!/bin/sh
# ── Hatai Pre-Commit Hook ──
# Scans staged files for secrets before allowing the commit.

echo "🔒 Hatai: Scanning staged files for secrets..."

# Get list of staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

if [ -z "$STAGED_FILES" ]; then
    exit 0
fi

SECRETS_FOUND=0

for FILE in $STAGED_FILES; do
    # Skip binary files
    if file "$FILE" | grep -q "binary"; then
        continue
    fi

    # Check for common secret patterns
    MATCHES=$(grep -nEi \\
        -e "AKIA[0-9A-Z]{16}" \\
        -e "sk-[a-zA-Z0-9]{20,}" \\
        -e "sk-ant-[a-zA-Z0-9-]{20,}" \\
        -e "gh[pous]_[a-zA-Z0-9]{36,}" \\
        -e "-----BEGIN.*PRIVATE KEY-----" \\
        -e "sk_live_[a-zA-Z0-9]{24,}" \\
        -e "(password|pwd|secret|token|api_key)\\s*[:=]\\s*[\\\"']?[^\\\"\\'\\s,;]{4,}" \\
        "$FILE" 2>/dev/null)

    if [ -n "$MATCHES" ]; then
        echo "⚠️  Secrets detected in $FILE:"
        echo "$MATCHES" | head -5
        SECRETS_FOUND=$((SECRETS_FOUND + 1))
    fi
done

if [ $SECRETS_FOUND -gt 0 ]; then
    echo ""
    echo "❌ Hatai: $SECRETS_FOUND file(s) contain potential secrets."
    echo "   Please redact them before committing."
    echo "   To bypass this check: git commit --no-verify"
    exit 1
fi

echo "✅ Hatai: No secrets detected. Commit allowed."
exit 0
`;

export function registerInstallGitHookCommand(
    context: vscode.ExtensionContext,
): vscode.Disposable {
    return vscode.commands.registerCommand('hatai.installGitHook', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('Hatai: No workspace folder open.');
            return;
        }

        const rootPath = workspaceFolders[0].uri.fsPath;
        const gitDir = path.join(rootPath, '.git');

        if (!fs.existsSync(gitDir)) {
            vscode.window.showErrorMessage(
                'Hatai: No .git directory found. Initialize a git repository first.',
            );
            return;
        }

        const hooksDir = path.join(gitDir, 'hooks');
        const hookPath = path.join(hooksDir, 'pre-commit');

        if (fs.existsSync(hookPath)) {
            const overwrite = await vscode.window.showWarningMessage(
                'Hatai: A pre-commit hook already exists. Overwrite?',
                'Overwrite',
                'Cancel',
            );
            if (overwrite !== 'Overwrite') {
                return;
            }
        }

        try {
            if (!fs.existsSync(hooksDir)) {
                fs.mkdirSync(hooksDir, { recursive: true });
            }

            fs.writeFileSync(hookPath, PRE_COMMIT_SCRIPT, { mode: 0o755 });

            vscode.window.showInformationMessage(
                'Hatai: ✅ Git pre-commit hook installed successfully!',
            );
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            vscode.window.showErrorMessage(
                `Hatai: Failed to install hook — ${message}`,
            );
        }
    });
}
