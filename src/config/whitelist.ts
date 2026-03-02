import * as vscode from 'vscode';
import * as crypto from 'crypto';

const STATE_KEY = 'hatai.whitelistHashes';

function hashValue(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
}

export class WhitelistStore {
    private hashes: Set<string>;

    constructor(private readonly state: vscode.Memento) {
        const persisted = state.get<string[]>(STATE_KEY, []);
        this.hashes = new Set(persisted);
    }

    public isWhitelisted(value: string): boolean {
        return this.hashes.has(hashValue(value));
    }

    public addToWhitelist(value: string): void {
        this.hashes.add(hashValue(value));
        this.persist();
    }

    public removeFromWhitelist(value: string): void {
        this.hashes.delete(hashValue(value));
        this.persist();
    }

    public clear(): void {
        this.hashes.clear();
        this.persist();
    }

    public get size(): number {
        return this.hashes.size;
    }

    private persist(): void {
        void this.state.update(STATE_KEY, Array.from(this.hashes));
    }
}
