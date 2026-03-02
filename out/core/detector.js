"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectSecrets = detectSecrets;
const crypto = require("crypto");
const patterns_1 = require("./patterns");
const entropy_1 = require("./entropy");
const redactor_1 = require("./redactor");
function buildLineIndex(text) {
    const starts = [0];
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '\n') {
            starts.push(i + 1);
        }
    }
    return starts;
}
function offsetToLineColumn(offset, lineStarts) {
    let low = 0;
    let high = lineStarts.length - 1;
    while (low < high) {
        const mid = Math.ceil((low + high) / 2);
        if (lineStarts[mid] <= offset) {
            low = mid;
        }
        else {
            high = mid - 1;
        }
    }
    return { line: low, column: offset - lineStarts[low] };
}
function detectSecrets(text, config) {
    const matches = [];
    const whitelist = new Set(config?.whitelist ?? []);
    const ignoredIds = new Set(config?.ignoredPatternIds ?? []);
    const patterns = [
        ...patterns_1.BuiltInPatterns,
        ...(config?.customPatterns ?? []),
    ];
    const lineStarts = buildLineIndex(text);
    for (const patternDef of patterns) {
        if (ignoredIds.has(patternDef.id)) {
            continue;
        }
        const regex = new RegExp(patternDef.pattern.source, patternDef.pattern.flags);
        let regexMatch;
        while ((regexMatch = regex.exec(text)) !== null) {
            const value = regexMatch[0];
            if (whitelist.has(value)) {
                continue;
            }
            const start = regexMatch.index;
            const end = start + value.length;
            const overlaps = matches.some((m) => (m.start <= start && m.end > start) ||
                (start <= m.start && end > m.start));
            if (overlaps) {
                continue;
            }
            const entropy = (0, entropy_1.calculateEntropy)(value);
            const { line, column } = offsetToLineColumn(start, lineStarts);
            matches.push({
                id: crypto.randomUUID(),
                type: patternDef.type,
                severity: patternDef.severity,
                value,
                redactedValue: (0, redactor_1.redactPartial)(value),
                start,
                end,
                line,
                column,
                entropy,
                patternId: patternDef.id,
            });
            if (value.length === 0) {
                regex.lastIndex++;
            }
        }
    }
    return matches.sort((a, b) => a.start - b.start);
}
//# sourceMappingURL=detector.js.map