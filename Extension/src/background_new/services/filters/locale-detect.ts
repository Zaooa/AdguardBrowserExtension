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
import { FiltersApi } from './api';
import { metadataStorage } from './metadata';
import { listeners } from '../../notifier';
import { UserAgent } from '../../../common/user-agent';
import { settingsStorage } from '../settings';
import { SettingOption } from '../../../common/settings';
import { Alerts } from '../ui/alerts';

/**
 * Initialize LocaleDetectService.
 *
 * This service is used to auto-enable language-specific filters.
 */
export const localeDetect = (function () {
    const browsingLanguages: {
        language: string,
        time: number,
    }[] = [];

    const SUCCESS_HIT_COUNT = 3;
    const MAX_HISTORY_LENGTH = 10;

    const domainToLanguagesMap = {
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

    /**
     * Called when LocaleDetectorService has detected language-specific filters we can enable.
     *
     * @param filterIds List of detected language-specific filters identifiers
     * @private
     */
    async function onFilterDetectedByLocale(filterIds: number[]) {
        if (!filterIds || filterIds.length === 0) {
            return;
        }

        await FiltersApi.loadAndEnableFilters(filterIds);

        listeners.notifyListeners(listeners.ENABLE_FILTER_SHOW_POPUP, filterIds);
    }

    /**
     * Stores language in the special array containing languages of the last visited pages.
     * If user has visited enough pages with a specified language we call special callback
     * to auto-enable filter for this language
     *
     * @param language Page language
     * @private
     */
    function detectLanguage(language: string) {
        /**
         * For an unknown language "und" will be returned
         * https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/tabs/detectLanguage
         */
        if (!language || language === 'und') {
            return;
        }

        browsingLanguages.push({
            language,
            time: Date.now(),
        });

        if (browsingLanguages.length > MAX_HISTORY_LENGTH) {
            browsingLanguages.shift();
        }

        const history = browsingLanguages.filter((h) => {
            return h.language === language;
        });

        if (history.length >= SUCCESS_HIT_COUNT) {
            const filterIds = metadataStorage.getFilterIdsForLanguage(language);
            onFilterDetectedByLocale(filterIds);
        }
    }

    /**
     * Detects language for the specified page
     * @param tabContext - tswebextension tab context
     */
    async function detectTabLanguage(tab: Tabs.Tab) {
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
                    detectLanguage(language);
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
            const lang = domainToLanguagesMap[tld];
            detectLanguage(lang);
        }
    }

    const init = () => {
        // Locale detect
        browser.tabs.onUpdated.addListener((_tabId, _changeInfo, tab) => {
            if (tab.status === 'complete') {
                detectTabLanguage(tab);
            }
        });
    };

    return {
        init,
    };
})();
