import browser from 'webextension-polyfill';

import { SettingOption } from '../../../common/settings';
import { StringStorage } from '../../storage';
import { i18n } from '../../utils/i18n';
import { settingsStorage } from '../settings/storage';
import {
    FiltersI18n,
    GroupsI18n,
    I18nMetadata,
    TagsI18n,
} from './i18n-metadata';

export type CommonFilterMetadata = {
    description: string,
    displayNumber: number,
    expires: number,
    filterId: number,
    groupId: number,
    homepage: string,
    languages: string[],
    name: string,
    subscriptionUrl: string,
    tags: number[],
    timeAdded: string,
    timeUpdated: string,
    trustLevel: string,
    version: string,
};

export type TagMetadata = {
    description: string
    keyword: string
    name: string
    tagId: number
};

export type GroupMetadata = {
    displayNumber: number
    groupId: number
    groupName: string
};

export type Metadata = {
    filters: CommonFilterMetadata[],
    groups: GroupMetadata[],
    tags: TagMetadata[]
};

export class MetadataStorage extends StringStorage<SettingOption, Metadata> {
    public getFilters() {
        return this.data.filters;
    }

    public getFilter(filterId: number) {
        return this.data.filters.find(el => el.filterId === filterId);
    }

    public getGroups() {
        return this.data.groups;
    }

    public getGroup(groupId: number) {
        return this.data.groups.find(el => el.groupId === groupId);
    }

    public getGroupByFilterId(filterId: number) {
        const filter = this.getFilter(filterId);

        if (!filter) {
            return;
        }

        return this.getGroup(filter.groupId);
    }

    public getTags() {
        return this.data.tags;
    }

    public getTag(tagId: number) {
        return this.data.tags.find(el => el.tagId === tagId);
    }

    /**
     * Gets list of filters for the specified languages
     */
    public getFilterIdsForLanguage(locale: string): number[] {
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

    /**
     * Refreshes metadata objects with i18n metadata
     * @param i18nMetadata
     */
    public static applyI18nMetadata(
        metadata: Metadata,
        i18nMetadata: I18nMetadata,
    ) {
        const tagsI18n = i18nMetadata.tags;
        const filtersI18n = i18nMetadata.filters;
        const groupsI18n = i18nMetadata.groups;

        const { tags, groups, filters } = metadata;

        for (let i = 0; i < tags.length; i += 1) {
            MetadataStorage.applyFilterTagLocalization(tags[i], tagsI18n);
        }

        for (let j = 0; j < filters.length; j += 1) {
            MetadataStorage.applyFilterLocalization(filters[j], filtersI18n);
        }

        for (let k = 0; k < groups.length; k += 1) {
            MetadataStorage.applyGroupLocalization(groups[k], groupsI18n);
        }

        return metadata;
    }

    /**
     * Localize tag
     */
    private static applyFilterTagLocalization(
        tag: TagMetadata,
        tagsI18n: TagsI18n,
    ) {
        const { tagId } = tag;
        const localizations = tagsI18n[tagId];
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
     */
    private static applyFilterLocalization(
        filter: CommonFilterMetadata,
        filtersI18n: FiltersI18n,
    ) {
        const { filterId } = filter;
        const localizations = filtersI18n[filterId];
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
     */
    private static applyGroupLocalization(
        group: GroupMetadata,
        groupsI18n: GroupsI18n,
    ) {
        const { groupId } = group;
        const localizations = groupsI18n[groupId];
        if (localizations) {
            const locale = i18n.normalize(localizations, browser.i18n.getUILanguage());
            const localization = localizations[locale];
            if (localization) {
                group.groupName = localization.name;
            }
        }
    }
}

export const metadataStorage = new MetadataStorage(SettingOption.METADATA, settingsStorage);
