"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HOOK_TEMPLATE = void 0;
exports.installPreCommitHook = installPreCommitHook;
const fs = require("fs");
const path = require("path");
exports.HOOK_TEMPLATE = `#!/bin/sh
# ── Hatai Pre-Commit Hook ──
# Scans staged files for secrets before allowing the commit.

echo "🔒 Hatai: Scanning staged files for secrets..."

STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

if [ -z "$STAGED_FILES" ]; then
    exit 0
fi

SECRETS_FOUND=0

for FILE in $STAGED_FILES; do
    if file "$FILE" | grep -q "binary"; then
        continue
    fi

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
    echo "   To bypass: git commit --no-verify"
    exit 1
fi

echo "✅ Hatai: No secrets detected. Commit allowed."
exit 0
`;
function installPreCommitHook(repoRoot, force = false) {
    const hooksDir = path.join(repoRoot, '.git', 'hooks');
    const hookPath = path.join(hooksDir, 'pre-commit');
    if (!fs.existsSync(path.join(repoRoot, '.git'))) {
        throw new Error('No .git directory found at the given path.');
    }
    if (fs.existsSync(hookPath) && !force) {
        throw new Error('A pre-commit hook already exists. Pass force=true to overwrite.');
    }
    if (!fs.existsSync(hooksDir)) {
        fs.mkdirSync(hooksDir, { recursive: true });
    }
    fs.writeFileSync(hookPath, exports.HOOK_TEMPLATE, { mode: 0o755 });
    return true;
}
//# sourceMappingURL=preCommitHook.js.map