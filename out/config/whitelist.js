"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhitelistStore = void 0;
const crypto = require("crypto");
const STATE_KEY = 'hatai.whitelistHashes';
function hashValue(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
}
class WhitelistStore {
    constructor(state) {
        this.state = state;
        const persisted = state.get(STATE_KEY, []);
        this.hashes = new Set(persisted);
    }
    isWhitelisted(value) {
        return this.hashes.has(hashValue(value));
    }
    addToWhitelist(value) {
        this.hashes.add(hashValue(value));
        this.persist();
    }
    removeFromWhitelist(value) {
        this.hashes.delete(hashValue(value));
        this.persist();
    }
    clear() {
        this.hashes.clear();
        this.persist();
    }
    get size() {
        return this.hashes.size;
    }
    persist() {
        void this.state.update(STATE_KEY, Array.from(this.hashes));
    }
}
exports.WhitelistStore = WhitelistStore;
//# sourceMappingURL=whitelist.js.map