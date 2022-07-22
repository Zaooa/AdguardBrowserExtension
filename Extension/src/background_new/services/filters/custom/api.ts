import MD5 from 'crypto-js/md5';

import { log } from '../../../../common/log';
import { ANTIBANNER_GROUPS_ID, CUSTOM_FILTERS_START_ID } from '../../../../common/constants';
import { CustomFilterMetadataStorage, CustomFilterMetadata } from './metadata';
import { filtersVersion } from '../filters-version';
import { filtersState } from '../filters-state';
import { FiltersStorage } from '../filters-storage';
import { Engine } from '../../../engine';
import { CustomFilterParsedData, CustomFilterParser } from './parser';
import { CustomFilterLoader } from './loader';
import { BrowserUtils } from '../../../utils/browser-utils';
import { networkService } from '../../network/network-service';

export type CreateCustomFilterOptions = {
    name?: string,
    trusted?: boolean,
};

export type CustomFilterInfo = CustomFilterParsedData & {
    customUrl: string,
    rulesCount: number,
};

export type GetCustomFilterInfoResult = { filter: CustomFilterInfo } | { errorAlreadyExists: boolean } | null;

export type GetRemoteCustomFilterResult = {
    rules: string[],
    checksum: string,
    parsed: CustomFilterParsedData,
};

export class CustomFilterApi {
    public static async getCustomFilterInfo(url: string, title?: string): Promise<GetCustomFilterInfoResult> {
        // Check if filter from this url was added before
        if (CustomFilterMetadataStorage.getByUrl(url)) {
            return { errorAlreadyExists: true };
        }

        const rules = await networkService.downloadFilterRulesBySubscriptionUrl(url) as string[];

        if (!rules) {
            return null;
        }

        const parsedData = CustomFilterParser.parseFilterDataFromHeader(rules);

        const filter = {
            ...parsedData,
            name: parsedData.name ? parsedData.name : title,
            timeUpdated: parsedData.timeUpdated ? parsedData.timeUpdated : new Date().toISOString(),
            customUrl: url,
            rulesCount: rules.filter(rule => rule.trim().indexOf('!') !== 0).length,
        };

        return { filter };
    }

    public static async createCustomFilter(
        url: string,
        options: CreateCustomFilterOptions,
    ): Promise<CustomFilterMetadata> {
        const { rules, parsed, checksum } = await CustomFilterApi.getRemoteCustomFilterData(url);

        const filterId = CustomFilterApi.genCustomFilterId();

        log.info(`Create new custom filter with id ${filterId}`);

        const trusted = !!options.trusted;
        const name = options.name ? options.name : parsed.name;

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
            customUrl: url,
            trusted,
        };

        await CustomFilterMetadataStorage.set(filterMetadata);

        await filtersVersion.set(filterId, {
            version,
            expires: Number(expires),
            lastUpdateTime: new Date(timeUpdated).getTime(),
            lastCheckTime: Date.now(),
        });

        await filtersState.set(filterId, {
            loaded: true,
            installed: true,
            enabled: false,
        });

        await FiltersStorage.set(filterId, rules);

        return filterMetadata;
    }

    public static async updateCustomFilter(filterId: number): Promise<CustomFilterMetadata | null> {
        log.info(`Update Custom filter ${filterId} ...`);

        const filterMetadata = CustomFilterMetadataStorage.getById(filterId);

        if (!filterMetadata) {
            log.error(`Can't find custom filter ${filterId} metadata`);
            return null;
        }

        const { customUrl } = filterMetadata;

        const fitlerRemoteData = await CustomFilterApi.getRemoteCustomFilterData(customUrl);

        if (!CustomFilterApi.isFilterNeedUpdate(filterMetadata, fitlerRemoteData)) {
            log.info(`Custom filter ${filterId} is already updated`);
            return null;
        }

        log.info(`Successfully update custom filter ${filterId}`);
        return CustomFilterApi.updateCustomFilterData(filterMetadata, fitlerRemoteData);
    }

    public static async removeCustomFilter(filterId: number): Promise<void> {
        log.info(`Remove Custom filter ${filterId} ...`);

        await CustomFilterMetadataStorage.remove(filterId);
        await filtersVersion.delete(filterId);

        const filterState = filtersState.get(filterId);

        await filtersState.delete(filterId);

        await FiltersStorage.remove(filterId);

        if (filterState.enabled) {
            await Engine.update();
        }
    }

    public static isCustomFilter(filterId: number): boolean {
        return filterId >= CUSTOM_FILTERS_START_ID;
    }

    public static getCustomFilterMetadata(filterId: number): CustomFilterMetadata {
        return CustomFilterMetadataStorage.getById(filterId);
    }

    public static getCustomFiltersMetadata(): CustomFilterMetadata[] {
        return CustomFilterMetadataStorage.getData();
    }

    /**
     * Update filter metadata, version state and stored rules
     */
    private static async updateCustomFilterData(
        filterMetadata: CustomFilterMetadata,
        { rules, checksum, parsed }: GetRemoteCustomFilterResult,
    ): Promise<CustomFilterMetadata> {
        const { filterId } = filterMetadata;

        const { version, expires, timeUpdated } = parsed;

        await filtersVersion.set(filterId, {
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

        await CustomFilterMetadataStorage.set(newFilterMetadata);

        await FiltersStorage.set(filterId, rules);

        return newFilterMetadata;
    }

    /**
     * Gets new filter id for custom filter
     */
    private static genCustomFilterId(): number {
        let max = 0;
        CustomFilterMetadataStorage.getData().forEach((f) => {
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

    private static async getRemoteCustomFilterData(url: string): Promise<GetRemoteCustomFilterResult> {
        log.info(`Get custom filter data from ${url}`);

        const rules = await CustomFilterLoader.downloadRulesWithTimeout(url);

        const parsed = CustomFilterParser.parseFilterDataFromHeader(rules);

        const { version } = parsed;

        const checksum = !version || !BrowserUtils.isSemver(version) ? CustomFilterApi.getChecksum(rules) : null;

        return { rules, parsed, checksum };
    }
}
