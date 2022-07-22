import browser from 'webextension-polyfill';
import FiltersDownloader from '@adguard/filters-downloader';

import { NetworkSettings } from './network-settings';
import { UserAgent } from '../../../common/user-agent';
import { log } from '../../../common/log';
import { strings } from '../../../common/strings';

export type NetworkConfiguration = {
    filtersMetadataUrl?: string,
    filterRulesUrl?: string,
    localFiltersFolder?: string,
    localFilterIds?: number[]
};

export type ExtensionXMLHttpRequest = XMLHttpRequest & { mozBackgroundRequest: boolean };

/**
 * Service for working with our backend server.
 * All requests sent by this class are covered in the privacy policy:
 * http://adguard.com/en/privacy.html#browsers
 */
export class NetworkService {
    private settings = new NetworkSettings();

    /**
     * FiltersDownloader constants
     */
    private filterCompilerConditionsConstants = {
        adguard: true,
        adguard_ext_chromium: UserAgent.isChrome,
        adguard_ext_firefox: UserAgent.isFirefox,
        adguard_ext_edge: UserAgent.isEdge,
        adguard_ext_safari: false,
        adguard_ext_opera: UserAgent.isOpera,
    };

    /**
     * Loading subscriptions map
     */
    private loadingSubscriptions = {};

    /**
     * Downloads filter rules by filter ID
     *
     * @param filterId              Filter identifier
     * @param forceRemote           Force download filter rules from remote server
     * @param useOptimizedFilters   Download optimized filters flag
     */
    public async downloadFilterRules(
        filterId: number,
        forceRemote: boolean,
        useOptimizedFilters: boolean,
    ): Promise<string[]> {
        let url: string;

        if (forceRemote || this.settings.localFilterIds.indexOf(filterId) < 0) {
            url = this.getUrlForDownloadFilterRules(filterId, useOptimizedFilters);
        } else {
            url = browser.runtime.getURL(`${this.settings.localFiltersFolder}/filter_${filterId}.txt`);
            if (useOptimizedFilters) {
                url = browser.runtime.getURL(`${this.settings.localFiltersFolder}/filter_mobile_${filterId}.txt`);
            }
        }

        return FiltersDownloader.download(url, this.filterCompilerConditionsConstants);
    }

    /**
     * Downloads filter rules by url
     *
     * @param url - Subscription url
     */
    public async downloadFilterRulesBySubscriptionUrl(url: string) {
        if (url in this.loadingSubscriptions) {
            return;
        }

        this.loadingSubscriptions[url] = true;

        try {
            let lines = await FiltersDownloader.download(url, this.filterCompilerConditionsConstants);
            lines = FiltersDownloader.resolveConditions(lines, this.filterCompilerConditionsConstants);

            delete this.loadingSubscriptions[url];

            if (lines[0].indexOf('[') === 0) {
                // [Adblock Plus 2.0]
                lines.shift();
            }

            return lines;
        } catch (e) {
            delete this.loadingSubscriptions[url];
            const message = e instanceof Error ? e.message : e;
            throw new Error(message);
        }
    }

    /**
     * Loads filter groups metadata
     */
    public async getLocalFiltersMetadata() {
        const url = browser.runtime.getURL(`${this.settings.localFiltersFolder}/filters.json`);

        let response;

        try {
            response = await NetworkService.executeRequestAsync(url, 'application/json');
        } catch (e) {
            const exMessage = e?.message || 'couldn\'t load local filters metadata';
            throw NetworkService.createError(exMessage, url);
        }

        if (!response?.responseText) {
            throw NetworkService.createError('empty response', url, response);
        }

        const metadata = NetworkService.parseJson(response.responseText);
        if (!metadata) {
            throw NetworkService.createError('invalid response', url, response);
        }

        return metadata;
    }

    /**
     * Loads filter groups metadata from local file
     * @returns {Promise}
     */
    public async getLocalFiltersI18nMetadata() {
        const url = browser.runtime.getURL(`${this.settings.localFiltersFolder}/filters_i18n.json`);

        let response;
        try {
            response = await NetworkService.executeRequestAsync(url, 'application/json');
        } catch (e) {
            const exMessage = e?.message || 'couldn\'t load local filters i18n metadata';
            throw NetworkService.createError(exMessage, url);
        }

        if (!response?.responseText) {
            throw NetworkService.createError('empty response', url, response);
        }

        const metadata = NetworkService.parseJson(response.responseText);
        if (!metadata) {
            throw NetworkService.createError('invalid response', url, response);
        }
        return metadata;
    }

    /**
     * Loads script rules from local file
     */
    public async getLocalScriptRules() {
        const url = browser.runtime.getURL(`${this.settings.localFiltersFolder}/local_script_rules.json`);

        let response;
        try {
            response = await NetworkService.executeRequestAsync(url, 'application/json');
        } catch (e) {
            const exMessage = e?.message || 'couldn\'t load local script rules';
            throw NetworkService.createError(exMessage, url);
        }

        if (!response?.responseText) {
            throw NetworkService.createError('empty response', url, response);
        }

        const metadata = NetworkService.parseJson(response.responseText);
        if (!metadata) {
            throw NetworkService.createError('invalid response', url, response);
        }

        return metadata;
    }

    /**
     * Downloads metadata from backend
     * @return {Promise<void>}
     */
    public async downloadMetadataFromBackend() {
        const response = await NetworkService.executeRequestAsync(this.settings.filtersMetadataUrl, 'application/json');
        if (!response?.responseText) {
            throw new Error(`Empty response: ${response}`);
        }

        const metadata = NetworkService.parseJson(response.responseText);
        if (!metadata) {
            throw new Error(`Invalid response: ${response}`);
        }

        return metadata;
    }

    /**
     * Downloads i18n metadata from backend
     * @return {Promise<void>}
     */
    public async downloadI18nMetadataFromBackend() {
        const response = await NetworkService.executeRequestAsync(
            this.settings.filtersI18nMetadataUrl,
            'application/json',
        );

        if (!response?.responseText) {
            throw new Error(`Empty response: ${response}`);
        }

        const metadata = NetworkService.parseJson(response.responseText);
        if (!metadata) {
            throw new Error(`Invalid response: ${response}`);
        }

        return metadata;
    }

    /**
     * Checks specified host hashes with our safebrowsing service
     *
     * @param hashes Host hashes
     */
    public async lookupSafebrowsing(hashes: string[]) {
        const url = `${this.settings.safebrowsingLookupUrl}?prefixes=${encodeURIComponent(hashes.join('/'))}`;
        const response = await NetworkService.executeRequestAsync(url, 'application/json');
        return response;
    }

    /**
     * Sends feedback from the user to our server
     *
     * @param url           URL
     * @param messageType   Message type
     * @param comment       Message text
     */
    public sendUrlReport(url: string, messageType: string, comment: string) {
        let params = `url=${encodeURIComponent(url)}`;
        params += `&messageType=${encodeURIComponent(messageType)}`;
        if (comment) {
            params += `&comment=${encodeURIComponent(comment)}`;
        }
        params = this.addKeyParameter(params);

        const request = new XMLHttpRequest();
        request.open('POST', this.settings.reportUrl);
        request.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        request.send(params);
    }

    /**
     * Sends filter hits stats to backend server.
     * This method is used if user has enabled "Send statistics for ad filters usage".
     * More information about ad filters usage stats:
     * http://adguard.com/en/filter-rules-statistics.html
     *
     * @param stats             Stats
     * @param enabledFilters    List of enabled filters
     */
    public sendHitStats(stats: string, enabledFilters: { filterId: number, version: string }[]) {
        let params = `stats=${encodeURIComponent(stats)}`;
        params += `&v=${encodeURIComponent(browser.runtime.getManifest().version)}`;
        params += `&b=${encodeURIComponent(UserAgent.browserName)}`;
        if (enabledFilters) {
            for (let i = 0; i < enabledFilters.length; i += 1) {
                const filter = enabledFilters[i];
                params += `&f=${encodeURIComponent(`${filter.filterId},${filter.version}`)}`;
            }
        }
        params = this.addKeyParameter(params);

        const request = new XMLHttpRequest();
        request.open('POST', this.settings.ruleStatsUrl);
        request.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        request.send(params);
    }

    public configure(configuration: NetworkConfiguration) {
        const { filtersMetadataUrl } = configuration;
        if (filtersMetadataUrl) {
            Object.defineProperty(this.settings, 'filtersMetadataUrl', {
                get() {
                    return filtersMetadataUrl;
                },
            });
        }

        const { filterRulesUrl } = configuration;
        if (filterRulesUrl) {
            Object.defineProperty(this.settings, 'filterRulesUrl', {
                get() {
                    return filterRulesUrl;
                },
            });
        }
        const { localFiltersFolder } = configuration;
        if (localFiltersFolder) {
            Object.defineProperty(this.settings, 'localFiltersFolder', {
                get() {
                    return localFiltersFolder;
                },
            });
        }

        const { localFilterIds } = configuration;
        if (localFilterIds) {
            Object.defineProperty(this.settings, 'localFilterIds', {
                get() {
                    return localFilterIds;
                },
            });
        }
    }

    /**
     * URL for downloading AG filter
     *
     * @param filterId Filter identifier
     * @param useOptimizedFilters
     */
    private getUrlForDownloadFilterRules(filterId: number, useOptimizedFilters: boolean): string {
        const url = useOptimizedFilters ? this.settings.optimizedFilterRulesUrl : this.settings.filterRulesUrl;
        return strings.replaceAll(url, '{filter_id}', filterId);
    }

    /**
     * Appends request key to url
     */
    private addKeyParameter(url: string): string {
        return `${url}&key=${this.settings.apiKey}`;
    }

    /**
     * Executes async request
     * @param url Url
     * @param contentType Content type
     */
    private static async executeRequestAsync(url: string, contentType: string): Promise<ExtensionXMLHttpRequest> {
        return new Promise((resolve, reject) => {
            const request = new XMLHttpRequest() as ExtensionXMLHttpRequest;
            try {
                request.open('GET', url);
                request.setRequestHeader('Content-type', contentType);
                request.setRequestHeader('Pragma', 'no-cache');
                request.overrideMimeType(contentType);
                request.mozBackgroundRequest = true;
                request.onload = function () {
                    resolve(request);
                };

                const errorCallbackWrapper = (errorMessage) => {
                    return (e) => {
                        let errorText = errorMessage;
                        if (e?.message) {
                            errorText = `${errorText}: ${e?.message}`;
                        }
                        const error = new Error(`Error: "${errorText}", statusText: ${request.statusText}`);
                        reject(error);
                    };
                };

                request.onerror = errorCallbackWrapper('An error occurred');
                request.onabort = errorCallbackWrapper('Request was aborted');
                request.ontimeout = errorCallbackWrapper('Request stopped by timeout');
                request.send(null);
            } catch (ex) {
                reject(ex);
            }
        });
    }

    /**
     * Safe json parsing
     * @param text
     * @private
     */
    private static parseJson(text: string) {
        try {
            return JSON.parse(text);
        } catch (ex) {
            log.error('Error parse json {0}', ex);
            return null;
        }
    }

    private static createError(message: string, url: string, response?: ExtensionXMLHttpRequest) {
        let errorMessage = `
            error:                    ${message}
            requested url:            ${url}`;

        if (response) {
            errorMessage = `
            error:                    ${message}
            requested url:            ${url}
            request status text:      ${response.statusText}`;
        }

        return new Error(errorMessage);
    }
}

export const networkService = new NetworkService();
