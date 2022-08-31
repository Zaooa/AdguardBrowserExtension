import { SettingOption } from '../../../common/settings';
import { listeners } from '../../notifier';
import {
    settingsStorage,
    allowlistDomainsStorage,
    invertedAllowlistDomainsStorage,
} from '../../storages';

export type DomainsStorage =
    | typeof allowlistDomainsStorage
    | typeof invertedAllowlistDomainsStorage;

/**
 * API for managing allowlist domain lists
 */
export class AllowlistApi {
    /**
     * Init domains storages
     */
    public static init() {
        AllowlistApi.initStorage(allowlistDomainsStorage);
        AllowlistApi.initStorage(invertedAllowlistDomainsStorage);
    }

    /**
     * Checks if allowlist in inverted
     */
    public static isInverted(): boolean {
        return !settingsStorage.get(SettingOption.DEFAULT_ALLOWLIST_MODE);
    }

    /**
     * Checks if allowlist is enabled
     */
    public static isEnabled(): boolean {
        return settingsStorage.get(SettingOption.ALLOWLIST_ENABLED);
    }

    /**
     * Gets domain list from allowlist storage
     */
    public static getAllowlistDomains(): string[] {
        return AllowlistApi.getDomains(allowlistDomainsStorage);
    }

    /**
     * Gets domain list from inverted allowlist storage
     */
    public static getInvertedAllowlistDomains(): string[] {
        return AllowlistApi.getDomains(invertedAllowlistDomainsStorage);
    }

    /**
     * Set domain list to allowlist storage
     * @param domains - array of domains
     */
    public static setAllowlistDomains(domains: string[]) {
        AllowlistApi.setDomains(domains, allowlistDomainsStorage);
    }

    /**
     * Set domain list to inverted allowlist storage
     * @param domains - array of domains
     */
    public static setInvertedAllowlistDomains(domains: string[]) {
        AllowlistApi.setDomains(domains, invertedAllowlistDomainsStorage);
    }

    /**
     * Add domain to allowlist storage
     * @param domain - domain string
     */
    public static addAllowlistDomain(domain: string) {
        AllowlistApi.addDomain(domain, allowlistDomainsStorage);
    }

    /**
     * Add domain to inverted allowlist storage
     * @param domain - domain string
     */
    public static addInvertedAllowlistDomain(domain: string) {
        AllowlistApi.addDomain(domain, invertedAllowlistDomainsStorage);
    }

    /**
     * Remove domain from allowlist storage
     * @param domain - domain string
     */
    public static removeAllowlistDomain(domain: string) {
        AllowlistApi.removeDomain(domain, allowlistDomainsStorage);
    }

    /**
     * Remove domain from inverted allowlist storage
     * @param domain - domain string
     */
    public static removeInvertedAllowlistDomain(domain: string) {
        AllowlistApi.removeDomain(domain, invertedAllowlistDomainsStorage);
    }

    /**
     * Add domain to specified storage
     */
    private static addDomain(domain: string, storage: DomainsStorage) {
        const domains = storage.getData();

        domains.push(domain);

        AllowlistApi.setDomains(domains, storage);
    }

    /**
     * Remove domain to specified storage
     */
    private static removeDomain(domain: string, storage: DomainsStorage) {
        const domains = storage.getData();

        AllowlistApi.setDomains(domains.filter(d => d !== domain), storage);
    }

    /**
     * Get domains from specified storage
     */
    private static getDomains(storage: DomainsStorage) {
        return storage.getData();
    }

    /**
     * Set domains list to specified storage
     */
    private static setDomains(domains: string[], storage: DomainsStorage) {
        /**
         * remove empty strings
         */
        domains = domains.filter(domain => !!domain);

        /**
         * remove duplicates
         */
        domains = Array.from(new Set(domains));

        storage.setData(domains);

        listeners.notifyListeners(listeners.UPDATE_ALLOWLIST_FILTER_RULES);
    }

    /**
     * Read stringified domains array from settings storage,
     * parse it and set memory cache
     *
     * if data is not exist, set empty array
     */
    private static initStorage(storage: DomainsStorage, defaultData: string[] = []) {
        try {
            const storageData = storage.read();
            if (storageData) {
                storage.setCache(JSON.parse(storageData));
            } else {
                storage.setData(defaultData);
            }
        } catch (e) {
            storage.setData(defaultData);
        }
    }
}
