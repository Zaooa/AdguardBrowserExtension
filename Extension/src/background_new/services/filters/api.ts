import { log } from '../../../common/log';
import {
    CustomFilterDTO,
    CustomFilterApi,
    CustomFilterMetadata,
    customFilterMetadataStorage,
} from './custom';
import { CommonFilterApi } from './common';
import { filtersState } from './filters-state';
import { filtersVersion } from './filters-version';
import { groupsState } from './groups-state';
import { i18nMetadataStorage } from './i18n-metadata';
import { metadataStorage, CommonFilterMetadata, MetadataStorage } from './metadata';
import { networkService } from '../network/network-service';
import {
    AntiBannerFiltersId,
    ANTIBANNER_GROUPS_ID,
    CUSTOM_FILTERS_GROUP_DISPLAY_NUMBER,
} from '../../../common/constants';
import { translator } from '../../../common/translators/translator';
import { SettingsBackup } from '../../../common/settings';
import { UserRulesApi } from './userrules';
import { AllowlistApi } from './allowlist';

/**
 * Encapsulates the logic for managing filter data that is stored in the extension.
 */
export class FiltersApi {
    /**
     * Initialize metadata and linked storages.
     *
     * Called while filters service initialization.
     */
    public static async init(): Promise<void> {
        await FiltersApi.initI18nMetadata();
        await FiltersApi.initMetadata();

        await customFilterMetadataStorage.init([]);

        await filtersState.init();
        await groupsState.init();
        await filtersVersion.init();
    }

    /**
     * Reset filters data to default
     */
    public static async reset() {
        /**
         * Clean up states
         */
        await filtersState.clear();
        await groupsState.clear();
        await filtersVersion.clear();

        /**
         * Force reload metadata
         */
        await FiltersApi.loadMetadata(false);
        await customFilterMetadataStorage.setData([]);

        /**
         * Clean up allowlist and userrules
         */
        await UserRulesApi.setUserRules([]);
        await AllowlistApi.setAllowlistDomains([]);
        await AllowlistApi.setInvertedAllowlistDomains([]);

        /**
         * Enable default filters
         */
        await CommonFilterApi.initDefaultFilters();
    }

    /**
     * Import filters from settings backup
     */
    public static async import(settingsBackup: SettingsBackup) {
        await FiltersApi.reset();

        const stealthSettings = settingsBackup.stealth;

        if (stealthSettings) {
            const stripTrackingParameterFlag = stealthSettings?.['strip-tracking-parameters'];

            if (typeof stripTrackingParameterFlag === 'boolean') {
                if (stripTrackingParameterFlag) {
                    await FiltersApi.loadAndEnableFilters([AntiBannerFiltersId.URL_TRACKING_FILTER_ID]);
                } else {
                    await filtersState.disableFilters([AntiBannerFiltersId.URL_TRACKING_FILTER_ID]);
                }
            }

            const blockKnownTrackersFlag = stealthSettings?.['block-known-trackers'];

            if (typeof blockKnownTrackersFlag === 'boolean') {
                if (blockKnownTrackersFlag) {
                    await FiltersApi.loadAndEnableFilters([AntiBannerFiltersId.TRACKING_FILTER_ID]);
                } else {
                    await filtersState.disableFilters([AntiBannerFiltersId.TRACKING_FILTER_ID]);
                }
            }
        }

        const generalSettings = settingsBackup['general-settings'];

        if (generalSettings) {
            const allowAcceptableAdsFlag = generalSettings?.['allow-acceptable-ads'];

            if (typeof allowAcceptableAdsFlag === 'boolean') {
                if (allowAcceptableAdsFlag) {
                    await FiltersApi.loadAndEnableFilters([AntiBannerFiltersId.SEARCH_AND_SELF_PROMO_FILTER_ID]);
                } else {
                    await filtersState.disableFilters([AntiBannerFiltersId.SEARCH_AND_SELF_PROMO_FILTER_ID]);
                }
            }
        }

        const filtersSettings = settingsBackup.filters;

        if (filtersSettings) {
            const enabledGroups = filtersSettings?.['enabled-groups'];

            if (Array.isArray(enabledGroups)) {
                await groupsState.enableGroups(enabledGroups);
            }

            const enabledFilters = filtersSettings?.['enabled-filters'];

            if (Array.isArray(enabledFilters)) {
                await FiltersApi.loadAndEnableFilters(enabledFilters);
            }

            const customFilters = filtersSettings?.['custom-filters'];

            if (Array.isArray(customFilters)) {
                await CustomFilterApi.createFilters(customFilters as CustomFilterDTO[]);
            }

            const userFilter = filtersSettings?.['user-filter'];

            if (userFilter?.rules) {
                await UserRulesApi.setUserRules(userFilter.rules.split('\n'));
            }

            const allowlist = filtersSettings?.whitelist;

            if (allowlist?.domains) {
                await AllowlistApi.setInvertedAllowlistDomains(allowlist['inverted-domains']);
            }

            if (allowlist?.['inverted-domains']) {
                await AllowlistApi.setAllowlistDomains(allowlist['inverted-domains']);
            }
        }
    }

    /**
     * Load metadata from remote source and reload linked storages.
     *
     * Called before filters rules are updated or loaded from backend.
     *
     * @param remote - is metadata loaded from backend
     */
    public static async loadMetadata(remote: boolean): Promise<void> {
        await FiltersApi.loadI18nMetadataFromBackend(remote);
        await FiltersApi.loadMetadataFromFromBackend(remote);

        /**
         * Reload states with new metadata
         */
        await filtersState.init();
        await groupsState.init();
        await filtersVersion.init();
    }

    /**
     * Checks if filter rules exist in browser storage.
     *
     * Called while filters loading.
     *
     * @param filterId - filter id
     */
    public static isFilterRulesIsLoaded(filterId: number) {
        const filterState = filtersState.get(filterId);

        return filterState?.loaded;
    }

    /**
     * Checks if filter is enabled
     *
     * @param filterId - filter id
     */
    public static isFilterEnabled(filterId: number) {
        const filterState = filtersState.get(filterId);

        return filterState?.enabled;
    }

    /**
     * Checks if filter is trusted
     *
     * @param filterId - filter id
     */
    public static isFilterTrusted(filterId: number): boolean {
        if (!CustomFilterApi.isCustomFilter(filterId)) {
            return true;
        }

        const metadata = CustomFilterApi.getFilterMetadata(filterId);

        return metadata.trusted;
    }

    /**
     * Load filters metadata and rules from external source.
     *
     * Skip loaded filters.
     *
     * @param filtersIds - loaded filters ids
     * @param remote - is metadata and rules loaded from backend
     */
    public static async loadFilters(filtersIds: number[], remote: boolean) {
        /**
         * Ignore loaded filters
         * Custom filters always has loaded state,
         * so we don't need additional check
         */
        const unloadedFilters = filtersIds.filter(id => !FiltersApi.isFilterRulesIsLoaded(id));

        if (unloadedFilters.length === 0) {
            return;
        }

        await FiltersApi.loadMetadata(remote);

        await Promise.allSettled(unloadedFilters.map(id => CommonFilterApi.loadFilterRulesFromBackend(id, remote)));
    }

    /**
     * Load and enable filter
     *
     * Called on filter option switch
     *
     * @param filtersIds - filters ids
     * @param remote - is metadata and rules loaded from backend
     */
    public static async loadAndEnableFilters(filtersIds: number[], remote = true) {
        await FiltersApi.loadFilters(filtersIds, remote);

        await filtersState.enableFilters(filtersIds);

        /**
         * we enable filters groups if it was never enabled or disabled early
         */
        FiltersApi.enableGroupsWereNotToggled(filtersIds);
    }

    /**
     * Force reload enabled common filters metadata and rules from backend
     *
     * Called on "use optimized filters" setting switch.
     *
     */
    public static async reloadEnabledFilters() {
        const filtersIds = FiltersApi.getEnabledFilters();

        /**
         * Ignore custom filters
         */
        const commonFilters = filtersIds.filter(id => CommonFilterApi.isCommonFilter(id));

        await FiltersApi.loadMetadata(true);

        await Promise.allSettled(commonFilters.map(id => CommonFilterApi.loadFilterRulesFromBackend(id, true)));

        await filtersState.enableFilters(filtersIds);
    }

    /**
     * Update filters
     *
     * @param filtersIds - filter ids
     */
    public static async updateFilters(filtersIds: number[]) {
        log.info('update filters ...');

        /**
         * Reload common filters metadata from backend for correct
         * version matching on update check.
         */
        FiltersApi.loadMetadata(true);

        const updatedFiltersMetadata = [];

        const updateTasks = filtersIds.map(async (filterId) => {
            let filterMetadata;

            if (CustomFilterApi.isCustomFilter(filterId)) {
                filterMetadata = await CustomFilterApi.updateFilter(filterId);
            } else {
                filterMetadata = await CommonFilterApi.updateFilter(filterId);
            }

            if (filterMetadata) {
                updatedFiltersMetadata.push(filterMetadata);
            }
        });

        await Promise.allSettled(updateTasks);

        return updatedFiltersMetadata;
    }

    /**
     * Get filter metadata from correct storage.
     *
     * @param filterId - filter id
     */
    public static getFilterMetadata(filterId: number): CustomFilterMetadata | CommonFilterMetadata {
        if (CustomFilterApi.isCustomFilter(filterId)) {
            return CustomFilterApi.getFilterMetadata(filterId);
        }
        return CommonFilterApi.getFilterMetadata(filterId);
    }

    /**
     * Get filters metadata from both common and custom filters storage.
     */
    public static getFiltersMetadata(): (CustomFilterMetadata | CommonFilterMetadata)[] {
        return [
            ...CommonFilterApi.getFiltersMetadata(),
            ...CustomFilterApi.getFiltersMetadata(),
        ];
    }

    /**
     * Get enabled filters given the state of the group
     */
    public static getEnabledFilters() {
        const enabledFilters = filtersState.getEnabledFilters();
        const enableGroups = groupsState.getEnabledGroups();

        return enabledFilters.filter(id => {
            const filterMetadata = FiltersApi.getFilterMetadata(id);

            return enableGroups.some(groupId => groupId === filterMetadata.groupId);
        });
    }

    /**
     * Enable filters groups that were not toggled by users
     *
     * Called on filter enabling
     *
     * @param filtersIds - filters ids
     */
    private static enableGroupsWereNotToggled(filtersIds: number[]) {
        const groupIds = [];

        for (let i = 0; i < filtersIds.length; i += 1) {
            const filterId = filtersIds[i];

            const filterMetadata = FiltersApi.getFilterMetadata(filterId);

            const groupId = filterMetadata?.groupId;

            if (groupId) {
                const group = groupsState.get(groupId);

                if (!group.toggled) {
                    groupIds.push(filterMetadata.groupId);
                }
            }
        }

        groupsState.enableGroups(groupIds);
    }

    /**
     * Load i18n metadata from remote source
     */
    private static async loadI18nMetadataFromBackend(remote: boolean) {
        const i18nMetadata = remote
            ? await networkService.downloadI18nMetadataFromBackend()
            : await networkService.getLocalFiltersI18nMetadata();

        await i18nMetadataStorage.setData(i18nMetadata);
    }

    /**
     * Load metadata from remote source
     */
    private static async loadMetadataFromFromBackend(remote: boolean) {
        const metadata = remote
            ? await networkService.downloadMetadataFromBackend()
            : await networkService.getLocalFiltersMetadata();

        const localizedMetadata = MetadataStorage.applyI18nMetadata(
            metadata,
            i18nMetadataStorage.getData(),
        );

        localizedMetadata.groups.push({
            groupId: ANTIBANNER_GROUPS_ID.CUSTOM_FILTERS_GROUP_ID,
            displayNumber: CUSTOM_FILTERS_GROUP_DISPLAY_NUMBER,
            groupName: translator.getMessage('options_antibanner_custom_group'),
        });

        await metadataStorage.setData(localizedMetadata);
    }

    /**
     * Read i18n metadata from storage
     * if data is not exist, load it from local assets
     */
    private static async initI18nMetadata() {
        const isI18nMetadataPersisted = await i18nMetadataStorage.init();

        if (!isI18nMetadataPersisted) {
            await FiltersApi.loadI18nMetadataFromBackend(false);
        }
    }

    /**
     * Read metadata from local storage
     * if data is not exist, load it from local assets
     */
    private static async initMetadata() {
        const isMetadataPersisted = await metadataStorage.init();

        if (!isMetadataPersisted) {
            await FiltersApi.loadMetadataFromFromBackend(false);
        }
    }
}
