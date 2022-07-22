import { StorageInterface } from './storage';

/**
 * Class for managing list data that is persisted as string
 *
 * Parses string from storage field on initialization once,
 * caches parsing result and sync cache with string data
 *
 */
export class ListStorage<K, V> {
    private key: K;

    private storage: StorageInterface<K>;

    private data: V[];

    constructor(key: K, storage: StorageInterface<K>) {
        this.key = key;
        this.storage = storage;
    }

    public async init() {
        const storageData = this.storage.get(this.key);

        if (typeof storageData === 'string') {
            this.data = JSON.parse(storageData);
        } else {
            await this.setData([]);
        }
    }

    public getData(): V[] {
        return this.data;
    }

    public async setData(data: V[]) {
        this.data = data;
        await this.storage.set(this.key, JSON.stringify(this.data));
    }
}
