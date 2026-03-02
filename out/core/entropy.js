"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateEntropy = calculateEntropy;
exports.isHighEntropy = isHighEntropy;
function calculateEntropy(value) {
    if (value.length === 0) {
        return 0;
    }
    const frequencyMap = new Map();
    for (const char of value) {
        frequencyMap.set(char, (frequencyMap.get(char) ?? 0) + 1);
    }
    let entropy = 0;
    const length = value.length;
    for (const count of frequencyMap.values()) {
        const probability = count / length;
        if (probability > 0) {
            entropy -= probability * Math.log2(probability);
        }
    }
    return entropy;
}
function isHighEntropy(value, threshold = 3.5) {
    return calculateEntropy(value) >= threshold;
}
//# sourceMappingURL=entropy.js.map