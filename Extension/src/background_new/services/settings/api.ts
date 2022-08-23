import { log } from '../../../common/log';
import { AntiBannerFiltersId } from '../../../common/constants';
import { SettingOption, SettingsBackup, settingsBackupValidator } from '../../../common/settings';
import { AllowlistApi } from '../filters/allowlist';
import { FiltersApi } from '../filters/api';
import { CustomFilterApi } from '../filters/custom';
import { filtersState } from '../filters/filters-state';
import { groupsState } from '../filters/groups-state';
import { UserRulesApi } from '../filters/userrules';

import { settingsStorage } from './storage';

export class SettingsApi {
    static async reset(): Promise<void> {
        await settingsStorage.reset();
        await FiltersApi.reset();
    }

    static async import(settingsBackupString: string) {
        try {
            const backup = JSON.parse(settingsBackupString);

            const validBackup = settingsBackupValidator.parse(backup);

            await settingsStorage.import(validBackup);
            await FiltersApi.import(validBackup);
            return true;
        } catch (e) {
            log.error(e);
            return false;
        }
    }

    static async export(): Promise<string> {
        const { settings } = settingsStorage;

        const backup: SettingsBackup = {
            'protocol-version': '1.0',
            'general-settings': {
                'allow-acceptable-ads': true,
                'show-blocked-ads-count': !settings[SettingOption.DISABLE_SHOW_PAGE_STATS],
                'autodetect-filters': !settings[SettingOption.DISABLE_DETECT_FILTERS],
                'safebrowsing-enabled': !settings[SettingOption.DISABLE_SAFEBROWSING],
                'filters-update-period': settings[SettingOption.FILTERS_UPDATE_PERIOD],
                'appearance-theme': settings[SettingOption.APPEARANCE_THEME],
            },
            'extension-specific-settings': {
                'use-optimized-filters': settings[SettingOption.USE_OPTIMIZED_FILTERS],
                'collect-hits-count': !settings[SettingOption.DISABLE_COLLECT_HITS],
                'show-context-menu': !settings[SettingOption.DISABLE_SHOW_CONTEXT_MENU],
                'show-info-about-adguard': !settings[SettingOption.DISABLE_SHOW_ADGUARD_PROMO_INFO],
                'show-app-updated-info': !settings[SettingOption.DISABLE_SHOW_APP_UPDATED_NOTIFICATION],
                'hide-rate-adguard': settings[SettingOption.HIDE_RATE_BLOCK],
                'user-rules-editor-wrap': settings[SettingOption.USER_RULES_EDITOR_WRAP],
            },
            filters: {
                'enabled-groups': groupsState.getEnabledGroups(),
                'enabled-filters': filtersState.getEnabledFilters().filter(id => id < 1000),
                'custom-filters': CustomFilterApi.getFiltersData(),
                'user-filter': {
                    rules: (await UserRulesApi.getUserRules()).join(),
                    'disabled-rules': '',
                    enabled: settings[SettingOption.USER_FILTER_ENABLED],
                },
                whitelist: {
                    inverted: !settings[SettingOption.DEFAULT_ALLOWLIST_MODE],
                    domains: AllowlistApi.getAllowlistDomains(),
                    'inverted-domains': AllowlistApi.getInvertedAllowlistDomains(),
                    enabled: settings[SettingOption.ALLOWLIST_ENABLED],
                },
            },
            stealth: {
                'stealth_disable_stealth_mode': settings[SettingOption.DISABLE_STEALTH_MODE],
                'stealth-hide-referrer': settings[SettingOption.HIDE_REFERRER],
                'stealth-hide-search-queries': settings[SettingOption.HIDE_SEARCH_QUERIES],
                'stealth-send-do-not-track': settings[SettingOption.SEND_DO_NOT_TRACK],
                'stealth-block-webrtc': settings[SettingOption.BLOCK_WEBRTC],
                'stealth-remove-x-client': settings[SettingOption.BLOCK_CHROME_CLIENT_DATA],
                'stealth-block-third-party-cookies': settings[SettingOption.SELF_DESTRUCT_THIRD_PARTY_COOKIES],
                'stealth-block-third-party-cookies-time':
                    settings[SettingOption.SELF_DESTRUCT_THIRD_PARTY_COOKIES_TIME],
                'stealth-block-first-party-cookies': settings[SettingOption.SELF_DESTRUCT_FIRST_PARTY_COOKIES],
                'stealth-block-first-party-cookies-time':
                    settings[SettingOption.SELF_DESTRUCT_FIRST_PARTY_COOKIES_TIME],
                'block-known-trackers': !!filtersState.get(AntiBannerFiltersId.TRACKING_FILTER_ID)?.enabled,
                'strip-tracking-parameters': !!filtersState.get(AntiBannerFiltersId.URL_TRACKING_FILTER_ID)?.enabled,
            },
        };

        return JSON.stringify(backup);
    }
}
