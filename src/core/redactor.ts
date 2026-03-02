import type { SecretMatch } from './detector';

export type RedactStrategy = 'full' | 'partial' | 'placeholder';

export function redact(text: string, matches: SecretMatch[], strategy: RedactStrategy = 'placeholder'): string {
    if (matches.length === 0) {
        return text;
    }

    const sorted = [...matches].sort((a, b) => b.start - a.start);
    let result = text;

    for (const match of sorted) {
        let replacement: string;

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

export function redactFull(): string {
    return '***REDACTED***';
}

export function redactPartial(value: string): string {
    if (value.length <= 4) {
        return '*'.repeat(value.length);
    }

    const prefix = value.substring(0, 2);
    const suffix = value.substring(value.length - 2);
    return `${prefix}${'*'.repeat(Math.min(value.length - 4, 10))}${suffix}`;
}

export function redactPlaceholder(type: string): string {
    return `{{${type.toUpperCase()}}}`;
}
