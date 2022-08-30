import {
    metadataStorage,
    filterStateStorage,
    groupStateStorage,
    filterVersionStorage,
    GroupMetadata,
    GroupState,
    TagMetadata,
    CommonFilterMetadata,
    FilterState,
    FilterVersionData,
    CustomFilterMetadata,
} from '../../storages';
import { FiltersApi } from './main';

export type CategoriesFilterData = (
    CommonFilterMetadata | CustomFilterMetadata &
    FilterState &
    FilterVersionData &
    { tagsDetails: TagMetadata[] }
);

export type CategoryData = (
    GroupMetadata &
    GroupState &
    { filters?: CategoriesFilterData[] }
);

/**
 * Helper class for aggregate filter groups data
 */
export class Categories {
    static getFiltersMetadata() {
        const groups = Categories.getGroups();
        const filters = Categories.getFilters();

        const categories: CategoryData[] = [];

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

        const tagsDetails: TagMetadata[] = [];

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

        const result: CategoriesFilterData[] = [];

        for (let i = 0; i < filtersMetadata.length; i += 1) {
            const filterMetadata = filtersMetadata[i];

            const tagsIds = filterMetadata.tags;

            const tagsDetails = Categories.getTagsDetails(tagsIds);

            const filterState = filterStateStorage.get(filterMetadata.filterId);

            const filterVersion = filterVersionStorage.get(filterMetadata.filterId);

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

        const result: CategoryData[] = [];

        for (let i = 0; i < groupsMetadata.length; i += 1) {
            const groupMetadata = groupsMetadata[i];

            const groupState = groupStateStorage.get(groupMetadata.groupId);

            result.push({
                ...groupMetadata,
                ...groupState,
            });
        }

        return result;
    }

    private static selectFiltersByGroupId(groupId: number, filters: CategoriesFilterData[]) {
        return filters.filter(filter => filter.groupId === groupId);
    }
}
