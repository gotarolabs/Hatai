"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedactStrategy = getRedactStrategy;
exports.isRealTimeScanningEnabled = isRealTimeScanningEnabled;
exports.isScanOnSaveEnabled = isScanOnSaveEnabled;
exports.getEntropyThreshold = getEntropyThreshold;
exports.showGutterIcons = showGutterIcons;
exports.getIgnoredPatternIds = getIgnoredPatternIds;
exports.allowAIReadSecrets = allowAIReadSecrets;
exports.allowUserCopySecrets = allowUserCopySecrets;
const vscode = require("vscode");
const SECTION = 'hatai';
function getRedactStrategy() {
    return vscode.workspace
        .getConfiguration(SECTION)
        .get('redactStrategy', 'placeholder');
}
function isRealTimeScanningEnabled() {
    return vscode.workspace
        .getConfiguration(SECTION)
        .get('enableRealTimeScanning', true);
}
function isScanOnSaveEnabled() {
    return vscode.workspace
        .getConfiguration(SECTION)
        .get('scanOnSave', true);
}
function getEntropyThreshold() {
    return vscode.workspace
        .getConfiguration(SECTION)
        .get('entropyThreshold', 3.5);
}
function showGutterIcons() {
    return vscode.workspace
        .getConfiguration(SECTION)
        .get('showGutterIcons', true);
}
function getIgnoredPatternIds() {
    return vscode.workspace
        .getConfiguration(SECTION)
        .get('ignoredPatternIds', []);
}
function allowAIReadSecrets() {
    return vscode.workspace
        .getConfiguration(SECTION)
        .get('allowAIReadSecrets', false);
}
function allowUserCopySecrets() {
    return vscode.workspace
        .getConfiguration(SECTION)
        .get('allowUserCopySecrets', false);
}
//# sourceMappingURL=settings.js.map