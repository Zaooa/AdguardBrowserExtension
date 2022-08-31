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
 * Cache with maxCacheSize stored in local storage,
 * which automatically clears less recently used entries
 */
export class LruCache<StorageKey, Key, Value> {
    protected key: StorageKey;

    protected storage: StorageInterface<StorageKey, string>;

    protected maxCacheSize: number;

    protected cacheSize: number;

    protected cache: LRUMap<Key, Value>;

    constructor(
        key: StorageKey,
        storage: StorageInterface<StorageKey, string>,
        maxCacheSize = 1000,
    ) {
        this.key = key;
        this.storage = storage;
        this.maxCacheSize = maxCacheSize;
    }

    public init() {
        const storageData = this.storage.get(this.key);

        if (!storageData) {
            this.setCache(null);
        }

        try {
            const entries = JSON.parse(storageData);
            this.setCache(entries);
        } catch (e) {
            this.setCache(null);
        }
    }

    public setCache(data: Iterable<[Key, Value]>): void {
        this.cache = new LRUMap(this.maxCacheSize, data);
        this.cacheSize = this.cache.size;
    }

    public saveCache() {
        return this.storage.set(this.key, JSON.stringify(this.cache.toJSON()));
    }

    public get(key: Key) {
        return this.cache.get(key);
    }

    public set(key: Key, value: Value) {
        this.cache.set(key, value);
        this.cacheSize += 1;

        if (this.cacheSize % 20 === 0) {
            return this.saveCache();
        }
    }

    public clear() {
        this.setCache(null);
        return this.saveCache();
    }
}
