/**
 * This file is part of Adguard Browser Extension (https://github.com/AdguardTeam/AdguardBrowserExtension).
 *
 * Adguard Browser Extension is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Adguard Browser Extension is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Adguard Browser Extension. If not, see <http://www.gnu.org/licenses/>.
 */

import browser, { Tabs } from 'webextension-polyfill';
import { isHttpRequest, getDomain } from '@adguard/tswebextension';

import { UserAgent } from '../../../common/user-agent';
import { SettingOption } from '../../../common/settings';
import {
    metadataStorage,
    settingsStorage,
} from '../../storages';
import { Engine } from '../../engine';
import { toasts } from '../ui';
import { FiltersApi } from './main';
import { CommonFilterApi } from './common';

export type BrowsingLanguage = {
    language: string,
    time: number,
};

/**
 *
 * This service is used to auto-enable language-specific filters.
 */
export class LocaleDetect {
    static SUCCESS_HIT_COUNT = 3;

    static MAX_HISTORY_LENGTH = 10;

    static domainToLanguagesMap = {
        // Russian
        'ru': 'ru',
        'ua': 'ru',
        'by': 'ru',
        'kz': 'ru',
        // English
        'com': 'en',
        'au': 'en',
        'uk': 'en',
        'nz': 'en',
        // German
        'de': 'de',
        'at': 'de',
        // Japanese
        'jp': 'ja',
        // Dutch
        'nl': 'nl',
        // French
        'fr': 'fr',
        // Spanish
        'es': 'es',
        // Italian
        'it': 'it',
        // Portuguese
        'pt': 'pt',
        // Polish
        'pl': 'pl',
        // Czech
        'cz': 'cs',
        // Bulgarian
        'bg': 'bg',
        // Lithuanian
        'lt': 'lt',
        // Latvian
        'lv': 'lv',
        // Arabic
        'eg': 'ar',
        'dz': 'ar',
        'kw': 'ar',
        'ae': 'ar',
        // Slovakian
        'sk': 'sk',
        // Romanian
        'ro': 'ro',
        // Suomi
        'fi': 'fi',
        // Icelandic
        'is': 'is',
        // Norwegian
        'no': 'no',
        // Greek
        'gr': 'el',
        // Hungarian
        'hu': 'hu',
        // Hebrew
        'il': 'he',
        // Chinese
        'cn': 'zh',
        // Indonesian
        'id': 'id',
        // Turkish
        'tr': 'tr',
    };

    private browsingLanguages: BrowsingLanguage[] = [];

    constructor() {
        this.onTabUpdated = this.onTabUpdated.bind(this);
    }

    public init() {
        browser.tabs.onUpdated.addListener(this.onTabUpdated);
    }

    private onTabUpdated(
        _tabId: number,
        _changeInfo: Tabs.OnUpdatedChangeInfoType,
        tab: Tabs.Tab,
    ) {
        if (tab.status === 'complete') {
            this.detectTabLanguage(tab);
        }
    }

    /**
     * Detects language for the specified tab
     */
    private async detectTabLanguage(tab: Tabs.Tab) {
        const isDetectDisabled = settingsStorage.get(SettingOption.DISABLE_DETECT_FILTERS);
        const isFilteringDisabled = settingsStorage.get(SettingOption.DISABLE_FILTERING);

        if (isDetectDisabled
            || isFilteringDisabled
            || !tab.url
            // Check language only for http://... tabs
            || !isHttpRequest(tab.url)
        ) {
            return;
        }

        // tabs.detectLanguage doesn't work in Opera
        // https://github.com/AdguardTeam/AdguardBrowserExtension/issues/997
        if (!UserAgent.isOpera) {
            if (tab.id && browser.tabs && browser.tabs.detectLanguage) {
                // https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/tabs/detectLanguage
                try {
                    const language = await browser.tabs.detectLanguage(tab.id);
                    this.detectLanguage(language);
                } catch (e) {
                    // do nothing
                }
                return;
            }
        }

        // Detecting language by top-level domain if extension API language detection is unavailable
        // Ignore hostnames which length is less or equal to 8
        // https://github.com/AdguardTeam/AdguardBrowserExtension/issues/1354
        const host = getDomain(tab.url);
        if (host && host.length > 8) {
            const parts = host ? host.split('.') : [];
            const tld = parts[parts.length - 1];
            const lang = LocaleDetect.domainToLanguagesMap[tld];
            this.detectLanguage(lang);
        }
    }

    /**
     * Stores language in the special array containing languages of the last visited pages.
     * If user has visited enough pages with a specified language we call special callback
     * to auto-enable filter for this language
     *
     * @param language Page language
     * @private
     */
    private detectLanguage(language: string) {
        /**
         * For an unknown language "und" will be returned
         * https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/tabs/detectLanguage
         */
        if (!language || language === 'und') {
            return;
        }

        this.browsingLanguages.push({
            language,
            time: Date.now(),
        });

        if (this.browsingLanguages.length > LocaleDetect.MAX_HISTORY_LENGTH) {
            this.browsingLanguages.shift();
        }

        const history = this.browsingLanguages.filter((h) => {
            return h.language === language;
        });

        if (history.length >= LocaleDetect.SUCCESS_HIT_COUNT) {
            const filterIds = metadataStorage.getFilterIdsForLanguage(language);
            LocaleDetect.onFilterDetectedByLocale(filterIds);
        }
    }

    /**
     * Called when LocaleDetector has detected language-specific filters we can enable.
     *
     * @param filterIds List of detected language-specific filters identifiers
     * @private
     */
    private static async onFilterDetectedByLocale(filterIds: number[]) {
        if (!filterIds || filterIds.length === 0) {
            return;
        }

        const disabledFiltersIds = filterIds.filter(filterId => !FiltersApi.isFilterEnabled(filterId));

        if (disabledFiltersIds.length === 0) {
            return;
        }

        await FiltersApi.loadAndEnableFilters(disabledFiltersIds);
        await Engine.update();

        const filters = disabledFiltersIds.map(filterId => CommonFilterApi.getFilterMetadata(filterId));

        toasts.showFiltersEnabledAlertMessage(filters);
    }
}

export const localeDetect = new LocaleDetect();
