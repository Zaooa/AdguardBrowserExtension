/* eslint-disable @typescript-eslint/no-explicit-any */
import browser from 'webextension-polyfill';
import { log } from '../../../common/log';
import { networkService } from '../network/network-service';
import { SettingOption } from '../../../common/settings';
import { settingsStorage } from '../settings';
import { ANTIBANNER_GROUPS_ID, CUSTOM_FILTERS_GROUP_DISPLAY_NUMBER } from '../../../common/constants';
import { i18n } from '../../utils/i18n';
import { translator } from '../../../common/translators/translator';

export class MetadataStorage {
    data = {
        filters: [],
        groups: [],
        tags: [],
    };

    /**
     * Parse metadata from local storage
     */
    async init(): Promise<void> {
        log.info('Initialize metadata');

        const storageData = settingsStorage.get(SettingOption.METADATA);

        if (storageData) {
            this.data = JSON.parse(storageData);
        } else {
            this.data = await networkService.getLocalFiltersMetadata();
        }

        await this.addCustomGroup();
        await this.updateStorageData();
        log.info('Metadata storage successfully initialize');
    }

    /**
     * Load metadata from external source
     * @param remote - is metadata loaded from backend
     */
    async loadMetadata(remote: boolean) {
        log.info('Loading metadata');

        this.data = remote
            ? await networkService.downloadMetadataFromBackend()
            : await networkService.getLocalFiltersMetadata();

        await this.addCustomGroup();
        await this.updateStorageData();
        log.info('Filters metadata loaded from backend');
    }

    getFilters() {
        return this.data.filters;
    }

    getFilter(filterId: number) {
        return this.data.filters.find(el => el.filterId === filterId);
    }

    getGroups() {
        return this.data.groups;
    }

    getGroup(groupId: number) {
        return this.data.groups.find(el => el.groupId === groupId);
    }

    getGroupByFilterId(filterId: number) {
        const filter = this.getFilter(filterId);

        if (!filter) {
            return;
        }

        return this.getGroup(filter.groupId);
    }

    getTags() {
        return this.data.tags;
    }

    getTag(tagId: number) {
        return this.data.tags.find(el => el.tagId === tagId);
    }

    async setFilter(filterId: number, filter: any) {
        const filters = this.getFilters().filter(f => f.filterId !== filterId);
        filters.push(filter);
        this.data.filters = filters;
        await this.updateStorageData();
    }

    async setGroup(groupId: number, group: any) {
        const groups = this.getGroups().filter(g => g.groupId !== groupId);
        groups.push(group);
        this.data.groups = groups;
        await this.updateStorageData();
    }

    async setTag(tagId: number, tag: any) {
        const tags = this.getTags().filter(t => t.tagId !== tagId);
        tags.push(tag);
        this.data.tags = tags;
        await this.updateStorageData();
    }

    /**
     * Refreshes metadata objects with i18n metadata
     * @param i18nMetadata
     */
    async applyI18nMetadata(i18nMetadata) {
        const tagsI18n = i18nMetadata.tags;
        const filtersI18n = i18nMetadata.filters;
        const groupsI18n = i18nMetadata.groups;

        const { tags, groups, filters } = this.data;

        for (let i = 0; i < tags.length; i += 1) {
            MetadataStorage.applyFilterTagLocalization(tags[i], tagsI18n);
        }

        for (let j = 0; j < filters.length; j += 1) {
            MetadataStorage.applyFilterLocalization(filters[j], filtersI18n);
        }

        for (let k = 0; k < groups.length; k += 1) {
            MetadataStorage.applyGroupLocalization(groups[k], groupsI18n);
        }

        this.data = { tags, groups, filters };

        await this.updateStorageData();
    }

    /**
     * Gets list of filters for the specified languages
     */
    getFilterIdsForLanguage(locale: string): number[] {
        if (!locale) {
            return [];
        }

        const filters = this.getFilters();
        const filterIds = [];
        for (let i = 0; i < filters.length; i += 1) {
            const filter = filters[i];
            const { languages } = filter;
            if (languages && languages.length > 0) {
                const language = i18n.normalize(languages, locale);
                if (language) {
                    filterIds.push(filter.filterId);
                }
            }
        }
        return filterIds;
    }

    private async addCustomGroup() {
        await this.setGroup(ANTIBANNER_GROUPS_ID.CUSTOM_FILTERS_GROUP_ID, {
            displayNumber: CUSTOM_FILTERS_GROUP_DISPLAY_NUMBER,
            groupId: ANTIBANNER_GROUPS_ID.CUSTOM_FILTERS_GROUP_ID,
            groupName: translator.getMessage('options_antibanner_custom_group'),
        });
    }

    private async updateStorageData(): Promise<void> {
        await settingsStorage.set(SettingOption.METADATA, JSON.stringify(this.data));
    }

    /**
     * Localize tag
     * @param tag
     * @param i18nMetadata
     * @private
     */
    private static applyFilterTagLocalization(tag, i18nMetadata) {
        const { tagId } = tag;
        const localizations = i18nMetadata[tagId];
        if (localizations) {
            const locale = i18n.normalize(localizations, browser.i18n.getUILanguage());
            const localization = localizations[locale];
            if (localization) {
                tag.name = localization.name;
                tag.description = localization.description;
            }
        }
    }

    /**
     * Localize filter
     * @param filter
     * @param i18nMetadata
     * @private
     */
    private static applyFilterLocalization(filter, i18nMetadata) {
        const { filterId } = filter;
        const localizations = i18nMetadata[filterId];
        if (localizations) {
            const locale = i18n.normalize(localizations, browser.i18n.getUILanguage());
            const localization = localizations[locale];
            if (localization) {
                filter.name = localization.name;
                filter.description = localization.description;
            }
        }
    }

    /**
     * Localize group
     * @param group
     * @param i18nMetadata
     * @private
     */
    private static applyGroupLocalization(group, i18nMetadata) {
        const { groupId } = group;
        const localizations = i18nMetadata[groupId];
        if (localizations) {
            const locale = i18n.normalize(localizations, browser.i18n.getUILanguage());
            const localization = localizations[locale];
            if (localization) {
                group.groupName = localization.name;
            }
        }
    }
}

export const metadataStorage = new MetadataStorage();
