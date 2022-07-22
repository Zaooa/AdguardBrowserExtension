import browser from 'webextension-polyfill';

export interface StorageInterface<K = string, V = unknown> {
    set(key: K, value: V): void | Promise<void>

    get(key: K): V | Promise<V>

    remove(key: K): void | Promise<V>
}

/**
 * browser.storage.local wrapper with dev-friendly interface
 */
export class Storage implements StorageInterface {
    private storage = browser.storage.local;

    async set(key: string, value: unknown): Promise<void> {
        await this.storage.set({ [key]: value });
    }

    async get(key: string): Promise<unknown> {
        return (await this.storage.get(key))[key];
    }

    async remove(key: string) {
        this.storage.remove(key);
    }
}

export const storage = new Storage();
