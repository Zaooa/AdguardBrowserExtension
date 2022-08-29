import { storage } from './main';

/**
 * Encapsulates interaction with stored filter rules
 */
export class FiltersStorage {
    static async set(filterId: number, filter: string[]): Promise<void> {
        const key = FiltersStorage.getFilterKey(filterId);

        await storage.set(key, filter);
    }

    static async get(filterId: number): Promise<string[]> {
        const key = FiltersStorage.getFilterKey(filterId);
        return storage.get(key) as Promise<string[]>;
    }

    static async remove(filterId: number) {
        const key = FiltersStorage.getFilterKey(filterId);
        return storage.remove(key);
    }

    private static getFilterKey(filterId: number): string {
        return `filterrules_${filterId}.txt`;
    }
}
