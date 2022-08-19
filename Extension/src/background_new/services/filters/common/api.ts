import browser from 'webextension-polyfill';

import { log } from '../../../../common/log';
import { filtersVersion } from '../filters-version';
import { filtersState } from '../filters-state';
import { FiltersStorage } from '../filters-storage';
import { BrowserUtils } from '../../../utils/browser-utils';
import { networkService } from '../../network/network-service';
import { CommonFilterMetadata, metadataStorage } from '../metadata';
import { settingsStorage } from '../../settings';
import { SettingOption } from '../../../../common/settings';
import { groupsState } from '../groups-state';
import { AntiBannerFiltersId, ANTIBANNER_GROUPS_ID } from '../../../../common/constants';
import { UserAgent } from '../../../../common/user-agent';
import { CustomFilterApi } from '../custom';

/**
 * API for managing common app filters
 */
export class CommonFilterApi {
    /**
     * Get common filter metadata
     */
    public static getFilterMetadata(filterId: number): CommonFilterMetadata | undefined {
        return metadataStorage.getFilter(filterId);
    }

    /**
     * Get common filters metadata
     */
    public static getFiltersMetadata(): CommonFilterMetadata[] {
        return metadataStorage.getFilters();
    }

    /**
     * Checks if filter is common
     *
     * @param filterId - filter id
     */
    public static isCommonFilter(filterId: number): boolean {
        return !CustomFilterApi.isCustomFilter(filterId)
        && filterId !== AntiBannerFiltersId.USER_FILTER_ID
        && filterId !== AntiBannerFiltersId.ALLOWLIST_FILTER_ID;
    }

    /**
     * Update common filter
     */
    public static async updateFilter(filterId: number): Promise<CommonFilterMetadata | null> {
        log.info(`Update filter ${filterId}`);

        const filterMetadata = CommonFilterApi.getFilterMetadata(filterId);

        if (!filterMetadata) {
            log.error(`Can't find filter ${filterId} metadata`);
            return null;
        }

        if (!CommonFilterApi.isFilterNeedUpdate(filterMetadata)) {
            log.info(`Filter ${filterId} is already updated`);
            return null;
        }

        try {
            await CommonFilterApi.loadFilterRulesFromBackend(filterId, true);
            log.info(`Successfully update filter ${filterId}`);
            return filterMetadata;
        } catch (e) {
            log.error(e);
            return null;
        }
    }

    /**
     * Download filter rules from backend and update filter state and metadata
     * @param filterId - filter id
     * @param remote - is filter rules loaded from backend
     */
    public static async loadFilterRulesFromBackend(filterId: number, remote: boolean) {
        const isOptimized = settingsStorage.get(SettingOption.USE_OPTIMIZED_FILTERS);

        const rules = await networkService.downloadFilterRules(filterId, remote, isOptimized) as string[];

        await FiltersStorage.set(filterId, rules);

        await filtersState.set(filterId, {
            installed: true,
            loaded: true,
            enabled: false,
        });

        const {
            version,
            expires,
            timeUpdated,
        } = CommonFilterApi.getFilterMetadata(filterId) as CommonFilterMetadata;

        await filtersVersion.set(filterId, {
            version,
            expires,
            lastUpdateTime: new Date(timeUpdated).getTime(),
            lastCheckTime: Date.now(),
        });
    }

    /**
     * Load and enable default common filters.
     *
     * Called on extension installation
     */
    public static async initDefaultFilters() {
        await groupsState.enableGroups([
            1,
            ANTIBANNER_GROUPS_ID.LANGUAGE_FILTERS_GROUP_ID,
            ANTIBANNER_GROUPS_ID.OTHER_FILTERS_GROUP_ID,
            ANTIBANNER_GROUPS_ID.CUSTOM_FILTERS_GROUP_ID,
        ]);

        const filterIds = [
            AntiBannerFiltersId.ENGLISH_FILTER_ID,
            AntiBannerFiltersId.SEARCH_AND_SELF_PROMO_FILTER_ID,
        ];

        if (UserAgent.isAndroid) {
            filterIds.push(AntiBannerFiltersId.MOBILE_ADS_FILTER_ID);
        }

        filterIds.push(...CommonFilterApi.getLangSuitableFilters());

        await Promise.allSettled(filterIds.map(id => CommonFilterApi.loadFilterRulesFromBackend(id, false)));

        await filtersState.enableFilters(filterIds);
    }

    /**
     * Get language-specific filters by user locale
     */
    private static getLangSuitableFilters(): number[] {
        let filterIds = [];

        let localeFilterIds = metadataStorage.getFilterIdsForLanguage(browser.i18n.getUILanguage());
        filterIds = filterIds.concat(localeFilterIds);

        // Get language-specific filters by navigator languages
        // Get all used languages
        const languages = BrowserUtils.getNavigatorLanguages();
        for (let i = 0; i < languages.length; i += 1) {
            localeFilterIds = metadataStorage.getFilterIdsForLanguage(languages[i]);
            filterIds = filterIds.concat(localeFilterIds);
        }

        return Array.from(new Set(filterIds));
    }

    /**
     * Checks if common filter need update.
     * Matches version from metadata with data in filter version storage.
     */
    private static isFilterNeedUpdate(filterMetadata: CommonFilterMetadata): boolean {
        log.info(`Check if filter ${filterMetadata.filterId} need to update`);

        const filterVersion = filtersVersion.get(filterMetadata.filterId);

        if (!filterVersion) {
            return true;
        }

        return !BrowserUtils.isGreaterOrEqualsVersion(filterVersion.version, filterMetadata.version);
    }
}
