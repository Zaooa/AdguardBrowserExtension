import { StorageInterface } from '../../common/storage';

/**
 * Class for managing data that is persisted as string
 */
export class StringStorage<K, V> {
    protected key: K;

    protected storage: StorageInterface<K>;

    protected data: V;

    constructor(
        key: K,
        storage: StorageInterface<K>,
    ) {
        this.key = key;
        this.storage = storage;
    }

    public getData(): V {
        return this.data;
    }

    public setCache(data: V) {
        this.data = data;
    }

    public setData(data: V) {
        this.setCache(data);
        this.save();
    }

    public save() {
        this.storage.set(this.key, JSON.stringify(this.data));
    }
}
