import { metadataStorage } from './metadata';
import { filtersState } from './filters-state';
import { groupsState } from './groups-state';
import { filtersVersion } from './filters-version';
import { FiltersApi } from './api';

export class Categories {
    static getFiltersMetadata() {
        const groups = Categories.getGroups();
        const filters = Categories.getFilters();

        const categories = [];

        for (let i = 0; i < groups.length; i += 1) {
            const category = groups[i];
            category.filters = Categories.selectFiltersByGroupId(category.groupId, filters);
            categories.push(category);
        }

        return {
            filters,
            categories,
        };
    }

    private static getTagsDetails(tagsIds: number[]) {
        const tagsMetadata = metadataStorage.getTags();

        const tagsDetails = [];

        for (let i = 0; i < tagsIds.length; i += 1) {
            const tagId = tagsIds[i];

            const tagDetails = tagsMetadata.find(tag => tag.tagId === tagId);

            if (tagDetails) {
                if (tagDetails.keyword.startsWith('reference:')) {
                    // Hide 'reference:' tags
                    continue;
                }

                if (!tagDetails.keyword.startsWith('lang:')) {
                    // Hide prefixes except of 'lang:'
                    tagDetails.keyword = tagDetails.keyword.substring(tagDetails.keyword.indexOf(':') + 1);
                }

                tagsDetails.push(tagDetails);
            }
        }

        return tagsDetails;
    }

    private static getFilters() {
        const filtersMetadata = FiltersApi.getFiltersMetadata();

        const result = [];

        for (let i = 0; i < filtersMetadata.length; i += 1) {
            const filterMetadata = filtersMetadata[i];

            const tagsIds = filterMetadata.tags;

            const tagsDetails = Categories.getTagsDetails(tagsIds);

            const filterState = filtersState.get(filterMetadata.filterId);

            const filterVersion = filtersVersion.get(filterMetadata.filterId);

            result.push({
                ...filterMetadata,
                ...filterState,
                ...filterVersion,
                tagsDetails,
            });
        }

        return result;
    }

    private static getGroups() {
        const groupsMetadata = metadataStorage.getGroups();

        const result = [];

        for (let i = 0; i < groupsMetadata.length; i += 1) {
            const groupMetadata = groupsMetadata[i];

            const groupState = groupsState.get(groupMetadata.groupId);

            result.push({
                ...groupMetadata,
                ...groupState,
            });
        }

        return result;
    }

    private static selectFiltersByGroupId(groupId: number, filters) {
        return filters.filter(filter => filter.groupId === groupId);
    }
}
