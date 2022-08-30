import {
    ANTIBANNER_GROUPS_ID,
    CUSTOM_FILTERS_GROUP_DISPLAY_NUMBER,
} from '../../../common/constants';
import { translator } from '../../../common/translators/translator';

import {
    CustomFilterMetadata,
    filterStateStorage,
    groupStateStorage,
    i18nMetadataStorage,
    metadataStorage,
    CommonFilterMetadata,
    MetadataStorage,
    filterVersionStorage,
    settingsStorage,
    GroupMetadata,
} from '../../storages';

import { network } from '../network';
import { UserRulesApi } from './userrules';
import { AllowlistApi } from './allowlist';
import { CommonFilterApi } from './common';
import { CustomFilterApi } from './custom';
import { pageStats } from './page-stats';
import { SettingOption } from '../../../common/settings';
import { localeDetect } from './locale-detect';

export type FilterMetadata = CommonFilterMetadata | CustomFilterMetadata;

/**
 * Encapsulates the logic for managing filter data that is stored in the extension.
 */
export class FiltersApi {
    /**
     * Initialize filters storages.
     *
     * Called while filters service initialization and app resetting.
     */
    public static async init(): Promise<void> {
        await FiltersApi.initI18nMetadata();
        await FiltersApi.initMetadata();

        pageStats.init();
        localeDetect.init();
        CustomFilterApi.init();
        AllowlistApi.init();
        await UserRulesApi.init();

        FiltersApi.loadFilteringStates();
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

        FiltersApi.loadFilteringStates();
    }

    /**
     * Checks if filter rules exist in browser storage.
     *
     * Called while filters loading.
     *
     * @param filterId - filter id
     */
    public static isFilterRulesIsLoaded(filterId: number) {
        const filterState = filterStateStorage.get(filterId);

        return filterState?.loaded;
    }

    /**
     * Checks if filter is enabled
     *
     * @param filterId - filter id
     */
    public static isFilterEnabled(filterId: number) {
        const filterState = filterStateStorage.get(filterId);

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

        filterStateStorage.enableFilters(filtersIds);

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

        filterStateStorage.enableFilters(filtersIds);
    }

    /**
     * Update filters
     *
     * @param filtersIds - filter ids
     */
    public static async updateFilters(filtersIds: number[]) {
        /**
         * Reload common filters metadata from backend for correct
         * version matching on update check.
         */
        await FiltersApi.loadMetadata(true);

        const updatedFiltersMetadata: FilterMetadata[] = [];

        const updateTasks = filtersIds.map(async (filterId) => {
            let filterMetadata: CustomFilterMetadata | CommonFilterMetadata | null;

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
    public static getFilterMetadata(filterId: number): FilterMetadata {
        if (CustomFilterApi.isCustomFilter(filterId)) {
            return CustomFilterApi.getFilterMetadata(filterId);
        }

        return CommonFilterApi.getFilterMetadata(filterId);
    }

    /**
     * Get filters metadata from both common and custom filters storage.
     */
    public static getFiltersMetadata(): FilterMetadata[] {
        return [
            ...CommonFilterApi.getFiltersMetadata(),
            ...CustomFilterApi.getFiltersMetadata(),
        ];
    }

    /**
     * Get enabled filters given the state of the group
     */
    public static getEnabledFilters() {
        const enabledFilters = filterStateStorage.getEnabledFilters();
        const enableGroups = groupStateStorage.getEnabledGroups();

        return enabledFilters.filter(id => {
            const filterMetadata = FiltersApi.getFilterMetadata(id);

            return enableGroups.some(groupId => groupId === filterMetadata?.groupId);
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
        const groupIds: number[] = [];

        for (let i = 0; i < filtersIds.length; i += 1) {
            const filterId = filtersIds[i];

            const filterMetadata = FiltersApi.getFilterMetadata(filterId);

            const groupId = filterMetadata?.groupId;

            if (groupId) {
                const group = groupStateStorage.get(groupId);

                if (!group.toggled) {
                    groupIds.push(filterMetadata.groupId);
                }
            }
        }

        if (groupIds.length > 0) {
            groupStateStorage.enableGroups(groupIds);
        }
    }

    /**
     * Load i18n metadata from remote source and save it
     */
    private static async loadI18nMetadataFromBackend(remote: boolean) {
        const i18nMetadata = remote
            ? await network.downloadI18nMetadataFromBackend()
            : await network.getLocalFiltersI18nMetadata();

        i18nMetadataStorage.setData(i18nMetadata);
    }

    /**
     * Load metadata from remote source,
     * apply i18n metadata, add custom group
     * and save it
     */
    private static async loadMetadataFromFromBackend(remote: boolean) {
        const metadata = remote
            ? await network.downloadMetadataFromBackend()
            : await network.getLocalFiltersMetadata();

        const localizedMetadata = MetadataStorage.applyI18nMetadata(
            metadata,
            i18nMetadataStorage.getData(),
        );

        localizedMetadata.groups.push({
            groupId: ANTIBANNER_GROUPS_ID.CUSTOM_FILTERS_GROUP_ID,
            displayNumber: CUSTOM_FILTERS_GROUP_DISPLAY_NUMBER,
            groupName: translator.getMessage('options_antibanner_custom_group'),
        });

        metadataStorage.setData(localizedMetadata);
    }

    /**
     * Read stringified i18n metadata from settings storage
     * if data is not exist, load it from local assets
     */
    private static async initI18nMetadata() {
        const storageData = settingsStorage.get(SettingOption.I18N_METADATA);

        if (!storageData) {
            await FiltersApi.loadI18nMetadataFromBackend(false);
            return;
        }

        try {
            i18nMetadataStorage.setCache(JSON.parse(storageData));
        } catch (e) {
            await FiltersApi.loadI18nMetadataFromBackend(false);
        }
    }

    /**
     * Read stringified metadata from settings storage
     * if data is not exist, load it from local assets
     */
    private static async initMetadata() {
        const storageData = settingsStorage.get(SettingOption.METADATA);

        if (!storageData) {
            await FiltersApi.loadMetadataFromFromBackend(false);
            return;
        }

        try {
            metadataStorage.setCache(JSON.parse(storageData));
        } catch (e) {
            await FiltersApi.loadMetadataFromFromBackend(false);
        }
    }

    /**
     * Set filtering states storages based on app metadata
     */
    private static loadFilteringStates() {
        const metadata = metadataStorage.getData();

        FiltersApi.initFilterStateStorage(metadata.filters);
        FiltersApi.initGroupStateStorage(metadata.groups);
        FiltersApi.initFilterVersionStorage(metadata.filters);
    }

    /**
     * Read stringified filter states data from settings storage
     * if data is not exist or partial, update filter states storage based on current filter metadata
     */
    private static initFilterStateStorage(metadata: CommonFilterMetadata[]) {
        const storageData = settingsStorage.get(SettingOption.FILTERS_STATE_PROP);

        if (!storageData) {
            filterStateStorage.update({}, metadata);
            return;
        }

        try {
            filterStateStorage.update(JSON.parse(storageData), metadata);
        } catch (e) {
            filterStateStorage.update({}, metadata);
        }
    }

    /**
     * Read stringified group states data from settings storage
     * if data is not exist or partial, update group states storage based on current group metadata
     */
    private static initGroupStateStorage(metadata: GroupMetadata[]) {
        const storageData = settingsStorage.get(SettingOption.GROUPS_STATE_PROP);

        if (!storageData) {
            groupStateStorage.update({}, metadata);
            return;
        }

        try {
            groupStateStorage.update(JSON.parse(storageData), metadata);
        } catch (e) {
            groupStateStorage.update({}, metadata);
        }
    }

    /**
     * Read stringified filter version data from settings storage
     * if data is not exist or partial, update filter version storage based on current filter metadata
     */
    private static initFilterVersionStorage(metadata: CommonFilterMetadata[]) {
        const storageData = settingsStorage.get(SettingOption.FILTERS_VERSION_PROP);

        if (!storageData) {
            filterVersionStorage.update({}, metadata);
            return;
        }

        try {
            filterVersionStorage.update(JSON.parse(storageData), metadata);
        } catch (e) {
            filterVersionStorage.update({}, metadata);
        }
    }
}
