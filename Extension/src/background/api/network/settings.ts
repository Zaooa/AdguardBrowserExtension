import { UserAgent } from '../../../common/user-agent';
import { BrowserUtils } from '../../utils/browser-utils';

export class NetworkSettings {
    // Base url of our backend server
    backendUrl = 'https://chrome.adtidy.org';

    apiKey = '4DDBE80A3DA94D819A00523252FB6380';

    // Browsing Security lookups. In case of Firefox lookups are disabled for HTTPS urls.
    safebrowsingLookupUrl = 'https://sb.adtidy.org/safebrowsing-lookup-short-hash.html';

    // Folder that contains filters metadata and files with rules. 'filters' by default
    localFiltersFolder = 'filters';

    // Path to the redirect sources
    redirectSourcesFolder = 'assets/libs/scriptlets';

    // Array of filter identifiers, that have local file with rules. Range from 1 to 14 by default
    localFilterIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

    // eslint-disable-next-line class-methods-use-this
    get filtersUrl(): string {
        if (UserAgent.isFirefox) {
            return 'https://filters.adtidy.org/extension/firefox';
        } if (UserAgent.isEdge) {
            return 'https://filters.adtidy.org/extension/edge';
        } if (UserAgent.isOpera) {
            return 'https://filters.adtidy.org/extension/opera';
        }
        return 'https://filters.adtidy.org/extension/chromium';
    }

    // URL for downloading AG filters
    get filterRulesUrl() {
        return `${this.filtersUrl}/filters/{filter_id}.txt`;
    }

    // URL for downloading optimized AG filters
    get optimizedFilterRulesUrl() {
        return `${this.filtersUrl}/filters/{filter_id}_optimized.txt`;
    }

    // URL for checking filter updates
    get filtersMetadataUrl() {
        const params = BrowserUtils.getExtensionParams();
        return `${this.filtersUrl}/filters.js?${params.join('&')}`;
    }

    // URL for downloading i18n localizations
    get filtersI18nMetadataUrl() {
        const params = BrowserUtils.getExtensionParams();
        return `${this.filtersUrl}/filters_i18n.json?${params.join('&')}`;
    }

    // URL for user complaints on missed ads or malware/phishing websites
    get reportUrl() {
        return `${this.backendUrl}/url-report.html`;
    }

    /**
     * URL for collecting filter rules statistics.
     * We do not collect it by default, unless user is willing to help.
     *
     * Filter rules stats are covered in our privacy policy and on also here:
     * http://adguard.com/en/filter-rules-statistics.html
     */
    get ruleStatsUrl() {
        return `${this.backendUrl}/rulestats.html`;
    }
}
