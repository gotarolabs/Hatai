export function calculateEntropy(value: string): number {
    if (value.length === 0) {
        return 0;
    }

    const frequencyMap = new Map<string, number>();

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

export function isHighEntropy(value: string, threshold: number = 3.5): boolean {
    return calculateEntropy(value) >= threshold;
}
