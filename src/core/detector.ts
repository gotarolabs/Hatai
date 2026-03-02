import * as crypto from 'crypto';
import { BuiltInPatterns, PatternDefinition, PatternSeverity } from './patterns';
import { calculateEntropy } from './entropy';
import { redactPartial } from './redactor';

export interface SecretMatch {
    
    id: string;
    
    type: string;
    
    severity: PatternSeverity;
    
    value: string;
    
    redactedValue: string;
    
    start: number;
    
    end: number;
    
    line: number;
    
    column: number;
    
    entropy: number;
    
    patternId: string;
}

export interface DetectorConfig {
    
    customPatterns?: PatternDefinition[];
    
    whitelist?: string[];
    
    entropyThreshold?: number;
    
    ignoredPatternIds?: string[];
}

function buildLineIndex(text: string): number[] {
    const starts: number[] = [0];
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '\n') {
            starts.push(i + 1);
        }
    }
    return starts;
}

function offsetToLineColumn(offset: number, lineStarts: number[]): { line: number; column: number } {
    let low = 0;
    let high = lineStarts.length - 1;

    while (low < high) {
        const mid = Math.ceil((low + high) / 2);
        if (lineStarts[mid] <= offset) {
            low = mid;
        } else {
            high = mid - 1;
        }
    }

    return { line: low, column: offset - lineStarts[low] };
}

export function detectSecrets(text: string, config?: DetectorConfig): SecretMatch[] {
    const matches: SecretMatch[] = [];
    const whitelist = new Set(config?.whitelist ?? []);
    const ignoredIds = new Set(config?.ignoredPatternIds ?? []);

    const patterns: PatternDefinition[] = [
        ...BuiltInPatterns,
        ...(config?.customPatterns ?? []),
    ];

    const lineStarts = buildLineIndex(text);

    for (const patternDef of patterns) {
        if (ignoredIds.has(patternDef.id)) {
            continue;
        }

        const regex = new RegExp(patternDef.pattern.source, patternDef.pattern.flags);
        let regexMatch: RegExpExecArray | null;

        while ((regexMatch = regex.exec(text)) !== null) {
            const value = regexMatch[0];

            if (whitelist.has(value)) {
                continue;
            }

            const start = regexMatch.index;
            const end = start + value.length;

            const overlaps = matches.some(
                (m) =>
                    (m.start <= start && m.end > start) ||
                    (start <= m.start && end > m.start),
            );
            if (overlaps) {
                continue;
            }

            const entropy = calculateEntropy(value);
            const { line, column } = offsetToLineColumn(start, lineStarts);

            matches.push({
                id: crypto.randomUUID(),
                type: patternDef.type,
                severity: patternDef.severity,
                value,
                redactedValue: redactPartial(value),
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
