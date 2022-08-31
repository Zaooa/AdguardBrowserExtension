import { StorageInterface } from '../../common/storage';

/**
 * Class for managing data that is persisted as string
 */
export class StringStorage<K, V> {
    protected key: K;

    protected storage: StorageInterface<K, string>;

    protected data: V;

    constructor(
        key: K,
        storage: StorageInterface<K, string>,
    ) {
        this.key = key;
        this.storage = storage;
    }

    public getData(): V {
        return this.data;
    }

    public setCache(data: V): void {
        this.data = data;
    }

    public setData(data: V) {
        this.setCache(data);
        return this.save();
    }

    public save() {
        return this.storage.set(this.key, JSON.stringify(this.data));
    }

    public read() {
        return this.storage.get(this.key);
    }
}
