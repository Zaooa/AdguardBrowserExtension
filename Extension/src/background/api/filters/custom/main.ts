import MD5 from 'crypto-js/md5';

import { BrowserUtils } from '../../../utils/browser-utils';
import { log } from '../../../../common/log';
import { ANTIBANNER_GROUPS_ID, CUSTOM_FILTERS_START_ID } from '../../../../common/constants';
import {
    customFilterMetadataStorage,
    CustomFilterMetadata,
    filterStateStorage,
    FiltersStorage,
    filterVersionStorage,
} from '../../../storages';
import { Engine } from '../../../engine';
import { network } from '../../network';
import { CustomFilterParsedData, CustomFilterParser } from './parser';
import { CustomFilterLoader } from './loader';

export type CustomFilterDTO = {
    customUrl: string;
    title?: string;
    trusted?: boolean;
    enabled?: boolean;
};

export type CustomFilterInfo = CustomFilterParsedData & {
    customUrl: string,
    rulesCount: number,
};

export type GetCustomFilterInfoResult = { filter: CustomFilterInfo } | { errorAlreadyExists: boolean } | null;

export type GetRemoteCustomFilterResult = {
    rules: string[],
    checksum: string | null,
    parsed: CustomFilterParsedData,
};

/**
 * API for managing custom filters
 */
export class CustomFilterApi {
    /**
     * Read stringified custom filter metadata from settings storage
     * if data is not exist, set empty array
     */
    public static init() {
        try {
            const storageData = customFilterMetadataStorage.read();
            if (storageData) {
                customFilterMetadataStorage.setCache(JSON.parse(storageData));
            } else {
                customFilterMetadataStorage.setData([]);
            }
        } catch (e) {
            customFilterMetadataStorage.setData([]);
        }
    }

    /**
     * Get custom filter info for modal window
     *
     * @param url - filter subscription url
     * @param title - user-defined filter title
     */
    public static async getFilterInfo(url: string, title?: string): Promise<GetCustomFilterInfoResult> {
        // Check if filter from this url was added before
        if (customFilterMetadataStorage.getByUrl(url)) {
            return { errorAlreadyExists: true };
        }

        const rules = await network.downloadFilterRulesBySubscriptionUrl(url) as string[];

        if (!rules) {
            return null;
        }

        const parsedData = CustomFilterParser.parseFilterDataFromHeader(rules);

        const filter = {
            ...parsedData,
            name: parsedData.name ? parsedData.name : title as string,
            timeUpdated: parsedData.timeUpdated ? parsedData.timeUpdated : new Date().toISOString(),
            customUrl: url,
            rulesCount: rules.filter(rule => rule.trim().indexOf('!') !== 0).length,
        };

        return { filter };
    }

    /**
     * Add custom filter
     */
    public static async createFilter(filterData: CustomFilterDTO): Promise<CustomFilterMetadata> {
        const { customUrl } = filterData;
        const { rules, parsed, checksum } = await CustomFilterApi.getRemoteFilterData(customUrl);

        const filterId = CustomFilterApi.genFilterId();

        log.info(`Create new custom filter with id ${filterId}`);

        const trusted = !!filterData.trusted;
        const enabled = !!filterData.enabled;
        const name = filterData.title ? filterData.title : parsed.name;

        const {
            description,
            homepage,
            expires,
            timeUpdated,
            version,
        } = parsed;

        const filterMetadata: CustomFilterMetadata = {
            filterId,
            groupId: ANTIBANNER_GROUPS_ID.CUSTOM_FILTERS_GROUP_ID,
            name,
            description,
            homepage,
            version,
            checksum,
            tags: [0],
            customUrl,
            trusted,
            expires: Number(expires),
            timeUpdated: new Date(timeUpdated).getTime(),
        };

        customFilterMetadataStorage.set(filterMetadata);

        filterVersionStorage.set(filterId, {
            version,
            expires: filterMetadata.expires,
            lastUpdateTime: filterMetadata.timeUpdated,
            lastCheckTime: Date.now(),
        });

        filterStateStorage.set(filterId, {
            loaded: true,
            installed: true,
            enabled,
        });

        await FiltersStorage.set(filterId, rules);

        return filterMetadata;
    }

    /**
     * Add custom filters
     */
    public static async createFilters(filtersData: CustomFilterDTO[]) {
        const tasks = filtersData.map(filterData => CustomFilterApi.createFilter(filterData));

        await Promise.allSettled(tasks);
    }

    /**
     * Update custom filter
     */
    public static async updateFilter(filterId: number): Promise<CustomFilterMetadata | null> {
        log.info(`Update Custom filter ${filterId} ...`);

        const filterMetadata = customFilterMetadataStorage.getById(filterId);

        if (!filterMetadata) {
            log.error(`Can't find custom filter ${filterId} metadata`);
            return null;
        }

        const { customUrl } = filterMetadata;

        const filterRemoteData = await CustomFilterApi.getRemoteFilterData(customUrl);

        if (!CustomFilterApi.isFilterNeedUpdate(filterMetadata, filterRemoteData)) {
            log.info(`Custom filter ${filterId} is already updated`);
            return null;
        }

        log.info(`Successfully update custom filter ${filterId}`);
        return CustomFilterApi.updateFilterData(filterMetadata, filterRemoteData);
    }

    /**
     * Remove custom filter
     */
    public static async removeFilter(filterId: number): Promise<void> {
        log.info(`Remove Custom filter ${filterId} ...`);

        customFilterMetadataStorage.remove(filterId);
        filterVersionStorage.delete(filterId);

        const filterState = filterStateStorage.get(filterId);

        filterStateStorage.delete(filterId);

        await FiltersStorage.remove(filterId);

        if (filterState.enabled) {
            await Engine.update();
        }
    }

    /**
     * Check if filter is custom
     */
    public static isCustomFilter(filterId: number): boolean {
        return filterId >= CUSTOM_FILTERS_START_ID;
    }

    /**
     * Get custom filter metadata
     */
    public static getFilterMetadata(filterId: number): CustomFilterMetadata {
        return customFilterMetadataStorage.getById(filterId);
    }

    /**
     * Get metadata for all custom filters
     */
    public static getFiltersMetadata(): CustomFilterMetadata[] {
        return customFilterMetadataStorage.getData();
    }

    /**
     * Get custom filters data
     */
    public static getFiltersData(): CustomFilterDTO[] {
        const filtersMetadata = CustomFilterApi.getFiltersMetadata();

        return filtersMetadata.map(({
            filterId,
            customUrl,
            name,
            trusted,
        }) => ({
            customUrl,
            title: name,
            trusted,
            enabled: !!filterStateStorage.get(filterId)?.enabled,
        }));
    }

    /**
     * Update filter metadata, version state and stored rules
     */
    private static async updateFilterData(
        filterMetadata: CustomFilterMetadata,
        { rules, checksum, parsed }: GetRemoteCustomFilterResult,
    ): Promise<CustomFilterMetadata> {
        const { filterId } = filterMetadata;

        const { version, expires, timeUpdated } = parsed;

        filterVersionStorage.set(filterId, {
            version,
            expires: Number(expires),
            lastUpdateTime: new Date(timeUpdated).getTime(),
            lastCheckTime: Date.now(),
        });

        const newFilterMetadata = {
            ...filterMetadata,
            version,
            checksum,
        };

        customFilterMetadataStorage.set(newFilterMetadata);

        await FiltersStorage.set(filterId, rules);

        return newFilterMetadata;
    }

    /**
     * Gets new filter id for custom filter
     */
    private static genFilterId(): number {
        let max = 0;
        customFilterMetadataStorage.getData().forEach((f) => {
            if (f.filterId > max) {
                max = f.filterId;
            }
        });

        return max >= CUSTOM_FILTERS_START_ID ? max + 1 : CUSTOM_FILTERS_START_ID;
    }

    /**
     * Count md5 checksum for the filter content
     */
    private static getChecksum(rules: string[]): string {
        const rulesText = rules.join('\n');
        return MD5(rulesText).toString();
    }

    /**
     * Check if custom filter need to update
     */
    private static isFilterNeedUpdate(
        filter: CustomFilterMetadata,
        { checksum, parsed }: GetRemoteCustomFilterResult,
    ): boolean {
        log.info(`Check if custom filter ${filter.filterId} need to update`);

        if (BrowserUtils.isSemver(filter.version) && BrowserUtils.isSemver(parsed.version)) {
            return !BrowserUtils.isGreaterOrEqualsVersion(filter.version, parsed.version);
        }

        if (!filter.checksum) {
            return true;
        }

        return checksum !== filter.checksum;
    }

    /**
     * Load filter from specified url
     */
    private static async getRemoteFilterData(url: string): Promise<GetRemoteCustomFilterResult> {
        log.info(`Get custom filter data from ${url}`);

        const rules = await CustomFilterLoader.downloadRulesWithTimeout(url);

        const parsed = CustomFilterParser.parseFilterDataFromHeader(rules);

        const { version } = parsed;

        const checksum = !version || !BrowserUtils.isSemver(version) ? CustomFilterApi.getChecksum(rules) : null;

        return { rules, parsed, checksum };
    }
}
