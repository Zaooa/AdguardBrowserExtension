import { SettingOption } from '../../../../common/settings';
import { listeners } from '../../../notifier';

import { settingsStorage } from '../../settings/storage';
import { StringStorage } from '../../../storage';

export type DomainsStorage = StringStorage<SettingOption, string[]>;

/**
 * API for managing allowlist domain lists
 */
export class AllowlistApi {
    /**
     * Storage for allowlist domains string array
     */
    private static allowlistDomainsStorage = new StringStorage<SettingOption, string[]>(
        SettingOption.ALLOWLIST_DOMAINS,
        settingsStorage,
    );

    /**
     * Storage for inverted allowlist domains string array
     */
    private static invertedAllowlistDomainsStorage = new StringStorage<SettingOption, string[]>(
        SettingOption.INVERTED_ALLOWLIST_DOMAINS,
        settingsStorage,
    );

    /**
     * Init domain storages
     */
    public static async init() {
        await AllowlistApi.allowlistDomainsStorage.init([]);
        await AllowlistApi.invertedAllowlistDomainsStorage.init([]);
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
        return AllowlistApi.getDomains(AllowlistApi.allowlistDomainsStorage);
    }

    /**
     * Gets domain list from inverted allowlist storage
     */
    public static getInvertedAllowlistDomains(): string[] {
        return AllowlistApi.getDomains(AllowlistApi.invertedAllowlistDomainsStorage);
    }

    /**
     * Set domain list to allowlist storage
     * @param domains - array of domains
     */
    public static async setAllowlistDomains(domains: string[]) {
        await AllowlistApi.setDomains(domains, AllowlistApi.allowlistDomainsStorage);
    }

    /**
     * Set domain list to inverted allowlist storage
     * @param domains - array of domains
     */
    public static async setInvertedAllowlistDomains(domains: string[]) {
        await AllowlistApi.setDomains(domains, AllowlistApi.invertedAllowlistDomainsStorage);
    }

    /**
     * Add domain to allowlist storage
     * @param domain - domain string
     */
    public static async addAllowlistDomain(domain: string) {
        await AllowlistApi.addDomain(domain, AllowlistApi.allowlistDomainsStorage);
    }

    /**
     * Add domain to inverted allowlist storage
     * @param domain - domain string
     */
    public static async addInvertedAllowlistDomain(domain: string) {
        await AllowlistApi.addDomain(domain, AllowlistApi.invertedAllowlistDomainsStorage);
    }

    /**
     * Remove domain from allowlist storage
     * @param domain - domain string
     */
    public static async removeAllowlistDomain(domain: string) {
        await AllowlistApi.removeDomain(domain, AllowlistApi.allowlistDomainsStorage);
    }

    /**
     * Remove domain from inverted allowlist storage
     * @param domain - domain string
     */
    public static async removeInvertedAllowlistDomain(domain: string) {
        await AllowlistApi.removeDomain(domain, AllowlistApi.invertedAllowlistDomainsStorage);
    }

    /**
     * Add domain to specified storage
     */
    private static async addDomain(domain: string, storage: DomainsStorage) {
        const domains = storage.getData();

        domains.push(domain);

        await AllowlistApi.setDomains(domains, storage);
    }

    /**
     * Remove domain to specified storage
     */
    private static async removeDomain(domain: string, storage: DomainsStorage) {
        const domains = storage.getData();

        await AllowlistApi.setDomains(domains.filter(d => d !== domain), storage);
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
    private static async setDomains(domains: string[], storage: DomainsStorage) {
        /**
         * remove empty strings
         */
        domains = domains.filter(domain => !!domain);

        /**
         * remove duplicates
         */
        domains = Array.from(new Set(domains));

        await storage.setData(domains);

        listeners.notifyListeners(listeners.UPDATE_ALLOWLIST_FILTER_RULES);
    }
}
