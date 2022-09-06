import { log } from '../../common/log';
import {
    SettingOption,
    AppearanceTheme,
    defaultSettings,
    Settings,
} from '../../common/settings';

import {
    AllowlistConfig,
    AllowlistOptions,
    configValidator,
    ExtensionSpecificSettingsConfig,
    ExtensionSpecificSettingsOptions,
    FiltersConfig,
    FiltersOptions,
    GeneralSettingsConfig,
    GeneralSettingsOptions,
    Options,
    PROTOCOL_VERSION,
    StealthConfig,
    StealthOptions,
    UserFilterConfig,
    UserFilterOptions,
} from '../configuration';

import {
    filterStateStorage,
    groupStateStorage,
    settingsStorage,
} from '../storages';

import { UserRulesApi } from './filters/userrules';
import { AllowlistApi } from './filters/allowlist';
import {
    CommonFilterApi,
    CustomFilterApi,
    CustomFilterDTO,
    FiltersApi,
} from './filters';
import { AntiBannerFiltersId } from '../../common/constants';

export class SettingsApi {
    public static set<T extends SettingOption>(key: T, value: Settings[T]): void {
        settingsStorage.set(key, value);
    }

    public static getData() {
        return {
            names: SettingOption,
            defaultValues: defaultSettings,
            values: settingsStorage.getSettings(),
        };
    }

    public static getTsWebExtConfiguration() {
        return {
            collectStats: !settingsStorage.get(SettingOption.DISABLE_COLLECT_HITS),
            allowlistInverted: !settingsStorage.get(SettingOption.DEFAULT_ALLOWLIST_MODE),
            allowlistEnabled: settingsStorage.get(SettingOption.ALLOWLIST_ENABLED),
            stealthModeEnabled: !settingsStorage.get(SettingOption.DISABLE_STEALTH_MODE),
            filteringEnabled: !settingsStorage.get(SettingOption.DISABLE_FILTERING),
            stealth: {
                blockChromeClientData: settingsStorage.get(SettingOption.BLOCK_CHROME_CLIENT_DATA),
                hideReferrer: settingsStorage.get(SettingOption.HIDE_REFERRER),
                hideSearchQueries: settingsStorage.get(SettingOption.HIDE_SEARCH_QUERIES),
                sendDoNotTrack: settingsStorage.get(SettingOption.SEND_DO_NOT_TRACK),
                blockWebRTC: settingsStorage.get(SettingOption.BLOCK_WEBRTC),
                selfDestructThirdPartyCookies: settingsStorage.get(SettingOption.SELF_DESTRUCT_THIRD_PARTY_COOKIES),
                selfDestructThirdPartyCookiesTime: (
                    settingsStorage.get(SettingOption.SELF_DESTRUCT_THIRD_PARTY_COOKIES_TIME)
                ),
                selfDestructFirstPartyCookies: settingsStorage.get(SettingOption.SELF_DESTRUCT_FIRST_PARTY_COOKIES),
                selfDestructFirstPartyCookiesTime: (
                    settingsStorage.get(SettingOption.SELF_DESTRUCT_FIRST_PARTY_COOKIES_TIME)
                ),
            },
        };
    }

    public static async reset() {
        const version = settingsStorage.get(SettingOption.APP_VERSION);

        const clientId = settingsStorage.get(SettingOption.CLIENT_ID);

        await UserRulesApi.setUserRules([]);

        // Set settings store to defaults
        settingsStorage.setSettings({
            ...defaultSettings,
            [SettingOption.APP_VERSION]: version,
            [SettingOption.CLIENT_ID]: clientId,
        });

        // Re-init filters
        await FiltersApi.init();

        await CommonFilterApi.initDefaultFilters();
    }

    public static async import(configText: string) {
        try {
            const json = JSON.parse(configText);
            const validConfig = configValidator.parse(json);

            await SettingsApi.reset();

            SettingsApi.importExtensionSpecificSettings(
                validConfig[Options.EXTENSION_SPECIFIC_SETTINGS],
            );

            if (validConfig[Options.STEALTH]) {
                await SettingsApi.importStealth(validConfig[Options.STEALTH]);
            }

            await SettingsApi.importGeneralSettings(validConfig[Options.GENERAL_SETTINGS]);
            await SettingsApi.importFilters(validConfig[Options.FILTERS]);

            return true;
        } catch (e) {
            log.error(e);
            return false;
        }
    }

    public static async export(): Promise<string> {
        return JSON.stringify({
            [Options.PROTOCOL_VERSION]: PROTOCOL_VERSION,
            [Options.GENERAL_SETTINGS]: SettingsApi.exportGeneralSettings(),
            [Options.EXTENSION_SPECIFIC_SETTINGS]: SettingsApi.exportExtensionSpecificSettings(),
            [Options.FILTERS]: await SettingsApi.exportFilters(),
            [Options.STEALTH]: SettingsApi.exportStealth(),
        });
    }

    private static async importGeneralSettings({
        [GeneralSettingsOptions.ALLOW_ACCEPTABLE_ADS]: allowAcceptableAds,
        [GeneralSettingsOptions.SHOW_BLOCKED_ADS_COUNT]: showBlockedAdsCount,
        [GeneralSettingsOptions.AUTODETECT_FILTERS]: autodetectFilters,
        [GeneralSettingsOptions.SAFEBROWSING_ENABLED]: safebrowsingEnabled,
        [GeneralSettingsOptions.FILTERS_UPDATE_PERIOD]: filtersUpdatePeriod,
        [GeneralSettingsOptions.APPEARANCE_THEME]: appearanceTheme,
    }: GeneralSettingsConfig): Promise<void> {
        // TODO: ALLOW_ACCEPTABLE_ADS

        settingsStorage.set(SettingOption.DISABLE_SHOW_PAGE_STATS, !showBlockedAdsCount);
        settingsStorage.set(SettingOption.DISABLE_DETECT_FILTERS, !autodetectFilters);
        settingsStorage.set(SettingOption.DISABLE_SAFEBROWSING, !safebrowsingEnabled);
        settingsStorage.set(SettingOption.FILTERS_UPDATE_PERIOD, filtersUpdatePeriod);

        if (appearanceTheme) {
            settingsStorage.set(SettingOption.APPEARANCE_THEME, appearanceTheme as AppearanceTheme);
        }

        if (allowAcceptableAds) {
            await CommonFilterApi.loadFilterRulesFromBackend(
                AntiBannerFiltersId.SEARCH_AND_SELF_PROMO_FILTER_ID,
                false,
            );
            filterStateStorage.enableFilters([AntiBannerFiltersId.SEARCH_AND_SELF_PROMO_FILTER_ID]);
        } else {
            filterStateStorage.disableFilters([AntiBannerFiltersId.SEARCH_AND_SELF_PROMO_FILTER_ID]);
        }
    }

    private static exportGeneralSettings(): GeneralSettingsConfig {
        return {
            [GeneralSettingsOptions.ALLOW_ACCEPTABLE_ADS]: (
                !!filterStateStorage.get(AntiBannerFiltersId.SEARCH_AND_SELF_PROMO_FILTER_ID)?.enabled
            ),
            [GeneralSettingsOptions.SHOW_BLOCKED_ADS_COUNT]: (
                !settingsStorage.get(SettingOption.DISABLE_SHOW_PAGE_STATS)
            ),
            [GeneralSettingsOptions.AUTODETECT_FILTERS]: !settingsStorage.get(SettingOption.DISABLE_DETECT_FILTERS),
            [GeneralSettingsOptions.SAFEBROWSING_ENABLED]: !settingsStorage.get(SettingOption.DISABLE_SAFEBROWSING),
            [GeneralSettingsOptions.FILTERS_UPDATE_PERIOD]: settingsStorage.get(SettingOption.FILTERS_UPDATE_PERIOD),
            [GeneralSettingsOptions.APPEARANCE_THEME]: settingsStorage.get(SettingOption.APPEARANCE_THEME),
        };
    }

    private static importExtensionSpecificSettings({
        [ExtensionSpecificSettingsOptions.USE_OPTIMIZED_FILTERS]: useOptimizedFilters,
        [ExtensionSpecificSettingsOptions.COLLECT_HITS_COUNT]: collectHitsCount,
        [ExtensionSpecificSettingsOptions.SHOW_CONTEXT_MENU]: showContextMenu,
        [ExtensionSpecificSettingsOptions.SHOW_INFO_ABOUT_ADGUARD]: showInfoAboutAdguard,
        [ExtensionSpecificSettingsOptions.SHOW_APP_UPDATED_INFO]: showAppUpdatedInfo,
        [ExtensionSpecificSettingsOptions.HIDE_RATE_ADGUARD]: hideRateAdguard,
        [ExtensionSpecificSettingsOptions.USER_RULES_EDITOR_WRAP]: userRulesEditorWrap,
    }: ExtensionSpecificSettingsConfig) {
        settingsStorage.set(SettingOption.USE_OPTIMIZED_FILTERS, useOptimizedFilters);
        settingsStorage.set(SettingOption.DISABLE_COLLECT_HITS, !collectHitsCount);
        settingsStorage.set(SettingOption.DISABLE_SHOW_CONTEXT_MENU, !showContextMenu);
        settingsStorage.set(SettingOption.DISABLE_SHOW_ADGUARD_PROMO_INFO, !showInfoAboutAdguard);
        settingsStorage.set(SettingOption.DISABLE_SHOW_APP_UPDATED_NOTIFICATION, !showAppUpdatedInfo);
        settingsStorage.set(SettingOption.HIDE_RATE_BLOCK, hideRateAdguard);
        settingsStorage.set(SettingOption.USER_RULES_EDITOR_WRAP, userRulesEditorWrap);
    }

    private static exportExtensionSpecificSettings(): ExtensionSpecificSettingsConfig {
        return {
            [ExtensionSpecificSettingsOptions.USE_OPTIMIZED_FILTERS]: (
                settingsStorage.get(SettingOption.USE_OPTIMIZED_FILTERS)
            ),
            [ExtensionSpecificSettingsOptions.COLLECT_HITS_COUNT]: (
                !settingsStorage.get(SettingOption.DISABLE_COLLECT_HITS)
            ),
            [ExtensionSpecificSettingsOptions.SHOW_CONTEXT_MENU]: (
                !settingsStorage.get(SettingOption.DISABLE_SHOW_CONTEXT_MENU)
            ),
            [ExtensionSpecificSettingsOptions.SHOW_INFO_ABOUT_ADGUARD]: (
                !settingsStorage.get(SettingOption.DISABLE_SHOW_ADGUARD_PROMO_INFO)
            ),
            [ExtensionSpecificSettingsOptions.SHOW_APP_UPDATED_INFO]: (
                !settingsStorage.get(SettingOption.DISABLE_SHOW_APP_UPDATED_NOTIFICATION)
            ),
            [ExtensionSpecificSettingsOptions.HIDE_RATE_ADGUARD]: (
                settingsStorage.get(SettingOption.HIDE_RATE_BLOCK)
            ),
            [ExtensionSpecificSettingsOptions.USER_RULES_EDITOR_WRAP]: (
                settingsStorage.get(SettingOption.USER_RULES_EDITOR_WRAP)
            ),
        };
    }

    private static async importFilters({
        [FiltersOptions.ENABLED_FILTERS]: enabledFilters,
        [FiltersOptions.ENABLED_GROUPS]: enabledGroups,
        [FiltersOptions.CUSTOM_FILTERS]: customFilters,
        [FiltersOptions.USER_FILTER]: userFilter,
        [FiltersOptions.ALLOWLIST]: allowlist,
    }: FiltersConfig) {
        await SettingsApi.importUserFilter(userFilter);
        SettingsApi.importAllowlist(allowlist);

        const tasks = enabledFilters.map(async filterId => {
            await CommonFilterApi.loadFilterRulesFromBackend(filterId, false);
            filterStateStorage.enableFilters([filterId]);
        });

        await Promise.allSettled(tasks);

        await CustomFilterApi.createFilters(customFilters as CustomFilterDTO[]);
        groupStateStorage.enableGroups(enabledGroups);
    }

    private static async exportFilters(): Promise<FiltersConfig> {
        return {
            [FiltersOptions.ENABLED_FILTERS]: filterStateStorage.getEnabledFilters(),
            [FiltersOptions.ENABLED_GROUPS]: groupStateStorage.getEnabledGroups(),
            [FiltersOptions.CUSTOM_FILTERS]: CustomFilterApi.getFiltersData(),
            [FiltersOptions.USER_FILTER]: await SettingsApi.exportUserFilter(),
            [FiltersOptions.ALLOWLIST]: SettingsApi.exportAllowlist(),
        };
    }

    private static async importUserFilter({
        [UserFilterOptions.ENABLED]: enabled,
        [UserFilterOptions.RULES]: rules,
    }: UserFilterConfig) {
        if (typeof enabled === 'boolean') {
            settingsStorage.set(SettingOption.USER_FILTER_ENABLED, enabled);
        } else {
            settingsStorage.set(SettingOption.USER_FILTER_ENABLED, true);
        }

        await UserRulesApi.setUserRules(rules.split('\n'));
    }

    private static async exportUserFilter(): Promise<UserFilterConfig> {
        return {
            [UserFilterOptions.ENABLED]: settingsStorage.get(SettingOption.USER_FILTER_ENABLED),
            [UserFilterOptions.RULES]: (await UserRulesApi.getUserRules()).join('/n'),
            [UserFilterOptions.DISABLED_RULES]: '',
        };
    }

    private static importAllowlist({
        [AllowlistOptions.ENABLED]: enabled,
        [AllowlistOptions.INVERTED]: inverted,
        [AllowlistOptions.DOMAINS]: domains,
        [AllowlistOptions.INVERTED_DOMAINS]: invertedDomains,
    }: AllowlistConfig) {
        if (typeof enabled === 'boolean') {
            settingsStorage.set(SettingOption.ALLOWLIST_ENABLED, enabled);
        } else {
            settingsStorage.set(SettingOption.ALLOWLIST_ENABLED, true);
        }

        if (typeof inverted === 'boolean') {
            settingsStorage.set(SettingOption.DEFAULT_ALLOWLIST_MODE, !inverted);
        } else {
            settingsStorage.set(SettingOption.DEFAULT_ALLOWLIST_MODE, true);
        }

        AllowlistApi.setAllowlistDomains(domains);
        AllowlistApi.setInvertedAllowlistDomains(invertedDomains);
    }

    private static exportAllowlist(): AllowlistConfig {
        return {
            [AllowlistOptions.ENABLED]: settingsStorage.get(SettingOption.ALLOWLIST_ENABLED),
            [AllowlistOptions.INVERTED]: !settingsStorage.get(SettingOption.DEFAULT_ALLOWLIST_MODE),
            [AllowlistOptions.DOMAINS]: AllowlistApi.getAllowlistDomains(),
            [AllowlistOptions.INVERTED_DOMAINS]: AllowlistApi.getInvertedAllowlistDomains(),
        };
    }

    private static async importStealth({
        [StealthOptions.DISABLE_STEALTH_MODE]: disableStealthMode,
        [StealthOptions.HIDE_REFERRER]: hideReferrer,
        [StealthOptions.HIDE_SEARCH_QUERIES]: hideSearchQueries,
        [StealthOptions.SEND_DO_NOT_TRACK]: sendDoNotTrack,
        [StealthOptions.BLOCK_WEBRTC]: blockWebRTC,
        [StealthOptions.REMOVE_X_CLIENT_DATA]: removeXClientData,
        [StealthOptions.BLOCK_THIRD_PARTY_COOKIES]: blockThirdPartyCookies,
        [StealthOptions.BLOCK_THIRD_PARTY_COOKIES_TIME]: blockThirdPartyCookiesTime,
        [StealthOptions.BLOCK_FIRST_PARTY_COOKIES]: blockFirstPartyCookies,
        [StealthOptions.BLOCK_FIRST_PARTY_COOKIES_TIME]: blockFirstPartyCookiesTime,
        [StealthOptions.BLOCK_KNOWN_TRACKERS]: blockKnownTrackers,
        [StealthOptions.STRIP_TRACKING_PARAMS]: stripTrackingParam,
    }: StealthConfig) {
        /**
         * set "block webrtc" setting as soon as possible. AG-9980
         * don't set the actual value to avoid requesting permissions
         */
        if (settingsStorage.get(SettingOption.BLOCK_WEBRTC) !== blockWebRTC) {
            settingsStorage.set(SettingOption.BLOCK_WEBRTC, blockWebRTC);
        }

        settingsStorage.set(SettingOption.DISABLE_STEALTH_MODE, disableStealthMode);
        settingsStorage.set(SettingOption.HIDE_REFERRER, hideReferrer);
        settingsStorage.set(SettingOption.HIDE_SEARCH_QUERIES, hideSearchQueries);
        settingsStorage.set(SettingOption.SEND_DO_NOT_TRACK, sendDoNotTrack);
        settingsStorage.set(SettingOption.BLOCK_CHROME_CLIENT_DATA, removeXClientData);
        settingsStorage.set(SettingOption.SELF_DESTRUCT_THIRD_PARTY_COOKIES, blockThirdPartyCookies);

        if (blockThirdPartyCookiesTime) {
            settingsStorage.set(SettingOption.SELF_DESTRUCT_THIRD_PARTY_COOKIES_TIME, blockThirdPartyCookiesTime);
        }

        settingsStorage.set(SettingOption.SELF_DESTRUCT_FIRST_PARTY_COOKIES, blockFirstPartyCookies);

        if (blockFirstPartyCookiesTime) {
            settingsStorage.set(SettingOption.SELF_DESTRUCT_FIRST_PARTY_COOKIES_TIME, blockFirstPartyCookiesTime);
        }

        if (stripTrackingParam) {
            await FiltersApi.loadAndEnableFilters([AntiBannerFiltersId.URL_TRACKING_FILTER_ID]);
        } else {
            filterStateStorage.disableFilters([AntiBannerFiltersId.URL_TRACKING_FILTER_ID]);
        }

        if (blockKnownTrackers) {
            await FiltersApi.loadAndEnableFilters([AntiBannerFiltersId.TRACKING_FILTER_ID]);
        } else {
            filterStateStorage.disableFilters([AntiBannerFiltersId.TRACKING_FILTER_ID]);
        }
    }

    private static exportStealth(): StealthConfig {
        return {
            [StealthOptions.DISABLE_STEALTH_MODE]: settingsStorage.get(SettingOption.DISABLE_STEALTH_MODE),
            [StealthOptions.HIDE_REFERRER]: settingsStorage.get(SettingOption.HIDE_REFERRER),
            [StealthOptions.HIDE_SEARCH_QUERIES]: settingsStorage.get(SettingOption.HIDE_SEARCH_QUERIES),
            [StealthOptions.SEND_DO_NOT_TRACK]: settingsStorage.get(SettingOption.SEND_DO_NOT_TRACK),
            [StealthOptions.BLOCK_WEBRTC]: settingsStorage.get(SettingOption.BLOCK_WEBRTC),
            [StealthOptions.REMOVE_X_CLIENT_DATA]: settingsStorage.get(SettingOption.BLOCK_CHROME_CLIENT_DATA),
            [StealthOptions.BLOCK_THIRD_PARTY_COOKIES]: (
                settingsStorage.get(SettingOption.SELF_DESTRUCT_THIRD_PARTY_COOKIES)
            ),
            [StealthOptions.BLOCK_THIRD_PARTY_COOKIES_TIME]: (
                settingsStorage.get(SettingOption.SELF_DESTRUCT_THIRD_PARTY_COOKIES_TIME)
            ),
            [StealthOptions.BLOCK_FIRST_PARTY_COOKIES]: (
                settingsStorage.get(SettingOption.SELF_DESTRUCT_FIRST_PARTY_COOKIES)
            ),
            [StealthOptions.BLOCK_FIRST_PARTY_COOKIES_TIME]: (
                settingsStorage.get(SettingOption.SELF_DESTRUCT_FIRST_PARTY_COOKIES_TIME)
            ),
            [StealthOptions.BLOCK_KNOWN_TRACKERS]: (
                !!filterStateStorage.get(AntiBannerFiltersId.TRACKING_FILTER_ID)?.enabled
            ),
            [StealthOptions.STRIP_TRACKING_PARAMS]: (
                !!filterStateStorage.get(AntiBannerFiltersId.URL_TRACKING_FILTER_ID)?.enabled
            ),
        };
    }
}
