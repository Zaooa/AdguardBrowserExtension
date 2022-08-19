import { StorageInterface } from './storage';

/**
 * Class for managing data that is persisted as string
 *
 * Parses string from storage field on initialization once,
 * caches parsing result and sync cache with string data
 *
 */
export class StringStorage<K, V> {
    protected key: K;

    protected storage: StorageInterface<K>;

    protected data: V | undefined;

    constructor(
        key: K,
        storage: StorageInterface<K>,
    ) {
        this.key = key;
        this.storage = storage;
    }

    public async init(defaultData?: V) {
        const storageData = this.storage.get(this.key);

        if (typeof storageData === 'string') {
            this.data = JSON.parse(storageData);
            return true;
        }

        if (defaultData) {
            await this.setData(defaultData);
            return true;
        }

        return false;
    }

    public getData(): V | undefined {
        return this.data;
    }

    public async setData(data: V) {
        this.data = data;
        await this.storage.set(this.key, JSON.stringify(this.data));
    }
}
