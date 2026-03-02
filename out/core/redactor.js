"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redact = redact;
exports.redactFull = redactFull;
exports.redactPartial = redactPartial;
exports.redactPlaceholder = redactPlaceholder;
function redact(text, matches, strategy = 'placeholder') {
    if (matches.length === 0) {
        return text;
    }
    const sorted = [...matches].sort((a, b) => b.start - a.start);
    let result = text;
    for (const match of sorted) {
        let replacement;
        switch (strategy) {
            case 'full':
                replacement = redactFull();
                break;
            case 'partial':
                replacement = redactPartial(match.value);
                break;
            case 'placeholder':
                replacement = redactPlaceholder(match.type);
                break;
        }
        result = result.substring(0, match.start) + replacement + result.substring(match.end);
    }
    return result;
}
function redactFull() {
    return '***REDACTED***';
}
function redactPartial(value) {
    if (value.length <= 4) {
        return '*'.repeat(value.length);
    }
    const prefix = value.substring(0, 2);
    const suffix = value.substring(value.length - 2);
    return `${prefix}${'*'.repeat(Math.min(value.length - 4, 10))}${suffix}`;
}
function redactPlaceholder(type) {
    return `{{${type.toUpperCase()}}}`;
}
//# sourceMappingURL=redactor.js.map