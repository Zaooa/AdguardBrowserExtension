import { AntiBannerFiltersId } from '../../../common/constants';
import { metadata } from './metadata';

export class FilterTags {
    static RECOMMENDED_TAG_ID = 10;

    static PURPOSE_ADS_TAG_ID = 1;

    static PURPOSE_PRIVACY_TAG_ID = 2;

    static PURPOSE_SOCIAL_TAG_ID = 3;

    static PURPOSE_SECURITY_TAG_ID = 4;

    static PURPOSE_ANNOYANCES_TAG_ID = 5;

    static PURPOSE_COOKIES_TAG_ID = 6;

    static PURPOSE_MOBILE_TAG_ID = 19;

    static getFiltersByTagId(tagId: number, filters) {
        return filters.filter(f => f.tags.indexOf(tagId) >= 0);
    }

    static getRecommendedFilters(filters) {
        return FilterTags.getFiltersByTagId(FilterTags.RECOMMENDED_TAG_ID, filters);
    }

    static isRecommendedFilter(filter) {
        return filter.tags.includes(FilterTags.RECOMMENDED_TAG_ID);
    }

    static isMobileFilter(filter) {
        return filter.tags.includes(FilterTags.PURPOSE_MOBILE_TAG_ID);
    }

    static getPurposeGroupedFilters() {
        const filters = metadata
            .getFilters()
            .filter(({ filterId }) => filterId !== AntiBannerFiltersId.SEARCH_AND_SELF_PROMO_FILTER_ID);

        const adsFilters = FilterTags.getFiltersByTagId(FilterTags.PURPOSE_ADS_TAG_ID, filters);
        const socialFilters = FilterTags.getFiltersByTagId(FilterTags.PURPOSE_SOCIAL_TAG_ID, filters);
        const privacyFilters = FilterTags.getFiltersByTagId(FilterTags.PURPOSE_PRIVACY_TAG_ID, filters);
        const annoyancesFilters = FilterTags.getFiltersByTagId(FilterTags.PURPOSE_ANNOYANCES_TAG_ID, filters);
        const cookiesFilters = FilterTags.getFiltersByTagId(FilterTags.PURPOSE_COOKIES_TAG_ID, filters);
        const securityFilters = FilterTags.getFiltersByTagId(FilterTags.PURPOSE_SECURITY_TAG_ID, filters);

        return {
            ads: adsFilters,
            social: socialFilters,
            privacy: privacyFilters,
            security: securityFilters,
            annoyances: annoyancesFilters,
            cookies: cookiesFilters,
        };
    }
}
