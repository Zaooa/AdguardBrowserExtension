import browser from 'webextension-polyfill';

import { StorageInterface } from '../../common/storage';

/**
 * browser.storage.local wrapper with dev-friendly interface
 */
export class Storage implements StorageInterface {
    private storage = browser.storage.local;

    public async set(key: string, value: unknown): Promise<void> {
        await this.storage.set({ [key]: value });
    }

    public async get(key: string): Promise<unknown> {
        return (await this.storage.get(key))?.[key];
    }

    public async remove(key: string) {
        this.storage.remove(key);
    }
}

export const storage = new Storage();
