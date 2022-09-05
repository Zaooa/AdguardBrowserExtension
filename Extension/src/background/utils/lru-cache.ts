/**
 * This file is part of Adguard Browser Extension (https://github.com/AdguardTeam/AdguardBrowserExtension).
 *
 * Adguard Browser Extension is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Adguard Browser Extension is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Adguard Browser Extension. If not, see <http://www.gnu.org/licenses/>.
 */

import { LRUMap } from 'lru_map';
import { StorageInterface } from '../../common/storage';

/**
 * LRU map stored in local storage,
 * which automatically clears less recently used entries
 */
export class LruCache<StorageKey, Key, Value> extends LRUMap<Key, Value> {
    protected key: StorageKey;

    protected storage: StorageInterface<StorageKey, string>;

    constructor(
        key: StorageKey,
        storage: StorageInterface<StorageKey, string>,
        limit = 1000,
    ) {
        super(limit);

        this.key = key;
        this.storage = storage;
    }

    public init() {
        const storageData = this.storage.get(this.key);

        if (!storageData) {
            return;
        }

        try {
            const entries = JSON.parse(storageData);
            this.assign(entries);
        } catch (e) {
            // do nothing
        }
    }

    public save(): void {
        this.storage.set(this.key, JSON.stringify(this.toJSON()));
    }

    public get(key: Key): Value {
        return super.get(key);
    }

    public set(key: Key, value: Value): LruCache<StorageKey, Key, Value> {
        super.set(key, value);

        if (this.size % 20 === 0) {
            this.save();
        }

        return this;
    }

    public clear(): void {
        this.clear();
        this.save();
    }
}
