import * as vscode from 'vscode';
import { RedactStrategy } from '../core/redactor';

const SECTION = 'hatai';

export function getRedactStrategy(): RedactStrategy {
    return vscode.workspace
        .getConfiguration(SECTION)
        .get<RedactStrategy>('redactStrategy', 'placeholder');
}

export function isRealTimeScanningEnabled(): boolean {
    return vscode.workspace
        .getConfiguration(SECTION)
        .get<boolean>('enableRealTimeScanning', true);
}

export function isScanOnSaveEnabled(): boolean {
    return vscode.workspace
        .getConfiguration(SECTION)
        .get<boolean>('scanOnSave', true);
}

export function getEntropyThreshold(): number {
    return vscode.workspace
        .getConfiguration(SECTION)
        .get<number>('entropyThreshold', 3.5);
}

export function showGutterIcons(): boolean {
    return vscode.workspace
        .getConfiguration(SECTION)
        .get<boolean>('showGutterIcons', true);
}

export function getIgnoredPatternIds(): string[] {
    return vscode.workspace
        .getConfiguration(SECTION)
        .get<string[]>('ignoredPatternIds', []);
}

export function allowAIReadSecrets(): boolean {
    return vscode.workspace
        .getConfiguration(SECTION)
        .get<boolean>('allowAIReadSecrets', false);
}

export function allowUserCopySecrets(): boolean {
    return vscode.workspace
        .getConfiguration(SECTION)
        .get<boolean>('allowUserCopySecrets', false);
}
