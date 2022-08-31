import browser from 'webextension-polyfill';
import { UserAgent } from './user-agent';

export enum SettingOption {
    CLIENT_ID = 'clientId',
    APP_VERSION = 'app-version',

    // filters states

    FILTERS_STATE_PROP = 'filters-state',
    FILTERS_VERSION_PROP = 'filters-version',
    GROUPS_STATE_PROP = 'groups-state',

    // filters metadata

    METADATA = 'filters-metadata',
    I18N_METADATA = 'filters-i18n-metadata',

    CUSTOM_FILTERS = 'custom_filters',

    // page stats

    PAGE_STATISTIC = 'page-statistic',

    // user settings

    DISABLE_DETECT_FILTERS = 'detect-filters-disabled',
    DISABLE_SHOW_PAGE_STATS = 'disable-show-page-statistic',

    // allowlist domains

    ALLOWLIST_DOMAINS = 'white-list-domains',
    INVERTED_ALLOWLIST_DOMAINS = 'block-list-domains',

    /* flag used to show link to comparison of desktop and browser adblocker versions */
    DISABLE_SHOW_ADGUARD_PROMO_INFO = 'show-info-about-adguard-disabled',

    DISABLE_SAFEBROWSING = 'safebrowsing-disabled',
    DISABLE_FILTERING = 'adguard-disabled',
    DISABLE_COLLECT_HITS = 'hits-count-disabled',
    DISABLE_SHOW_CONTEXT_MENU = 'context-menu-disabled',
    USE_OPTIMIZED_FILTERS = 'use-optimized-filters',
    DEFAULT_ALLOWLIST_MODE = 'default-whitelist-mode',
    ALLOWLIST_ENABLED = 'allowlist-enabled',
    DISABLE_SHOW_APP_UPDATED_NOTIFICATION = 'show-app-updated-disabled',
    FILTERS_UPDATE_PERIOD = 'filters-update-period',
    APPEARANCE_THEME = 'appearance-theme',

    /* User filter */
    USER_FILTER_ENABLED = 'user-filter-enabled',

    /* STEALTH MODE */
    DISABLE_STEALTH_MODE = 'stealth-disable-stealth-mode',
    HIDE_REFERRER = 'stealth-hide-referrer',
    HIDE_SEARCH_QUERIES = 'stealth-hide-search-queries',
    SEND_DO_NOT_TRACK = 'stealth-send-do-not-track',
    BLOCK_CHROME_CLIENT_DATA = 'stealth-remove-x-client',
    BLOCK_WEBRTC = 'stealth-block-webrtc',
    SELF_DESTRUCT_THIRD_PARTY_COOKIES = 'stealth-block-third-party-cookies',
    SELF_DESTRUCT_THIRD_PARTY_COOKIES_TIME = 'stealth-block-third-party-cookies-time',
    SELF_DESTRUCT_FIRST_PARTY_COOKIES = 'stealth-block-first-party-cookies',
    SELF_DESTRUCT_FIRST_PARTY_COOKIES_TIME = 'stealth-block-first-party-cookies-time',

    /* UI misc */
    HIDE_RATE_BLOCK = 'hide-rate-block',
    USER_RULES_EDITOR_WRAP = 'user-rules-editor-wrap',

    /* Notifications */
    LAST_NOTIFICATION_TIME = 'viewed-notification-time',
    VIEWED_NOTIFICATIONS = 'viewed-notifications',

    /* Safebrowsing */
    SB_LRU_CACHE = 'sb-lru-cache',
    SB_SUSPENDED_CACHE = 'safebrowsing-suspended-from',
}

export const enum AppearanceTheme {
    SYSTEM = 'system',
    DARK = 'dark',
    LIGHT = 'light',
}

export const ADGUARD_SETTINGS_KEY = 'adguard-settings';

export const DEFAULT_FILTERS_UPDATE_PERIOD = -1;

export const DEFAULT_FIRST_PARTY_COOKIES_SELF_DESTRUCT_MIN = 4320;

export const DEFAULT_THIRD_PARTY_COOKIES_SELF_DESTRUCT_MIN = 2880;

export const DEFAULT_ALLOWLIST = [];

export const DEFAULT_INVERTED_ALLOWLIST = [];

export type Settings = {
    [SettingOption.CLIENT_ID]: string,
    [SettingOption.APP_VERSION]: string,
    [SettingOption.DISABLE_SHOW_ADGUARD_PROMO_INFO]: boolean,
    [SettingOption.DISABLE_SAFEBROWSING]: boolean,
    [SettingOption.DISABLE_COLLECT_HITS]: boolean,
    [SettingOption.DEFAULT_ALLOWLIST_MODE]: boolean,
    [SettingOption.ALLOWLIST_ENABLED]: boolean,
    [SettingOption.USE_OPTIMIZED_FILTERS]: boolean,
    [SettingOption.DISABLE_DETECT_FILTERS]: boolean,
    [SettingOption.DISABLE_SHOW_APP_UPDATED_NOTIFICATION]: boolean,
    [SettingOption.FILTERS_UPDATE_PERIOD]: number,
    [SettingOption.DISABLE_STEALTH_MODE]: boolean,
    [SettingOption.HIDE_REFERRER]: boolean,
    [SettingOption.HIDE_SEARCH_QUERIES]: boolean,
    [SettingOption.SEND_DO_NOT_TRACK]: boolean,
    [SettingOption.BLOCK_CHROME_CLIENT_DATA]: boolean,
    [SettingOption.BLOCK_WEBRTC]: boolean,
    [SettingOption.SELF_DESTRUCT_THIRD_PARTY_COOKIES]: boolean,
    [SettingOption.SELF_DESTRUCT_THIRD_PARTY_COOKIES_TIME]:number,
    [SettingOption.SELF_DESTRUCT_FIRST_PARTY_COOKIES]: boolean,
    [SettingOption.SELF_DESTRUCT_FIRST_PARTY_COOKIES_TIME]:number,
    [SettingOption.APPEARANCE_THEME]: AppearanceTheme,
    [SettingOption.USER_FILTER_ENABLED]: boolean,
    [SettingOption.HIDE_RATE_BLOCK]: boolean,
    [SettingOption.USER_RULES_EDITOR_WRAP]: boolean,
    [SettingOption.DISABLE_FILTERING]: boolean,
    [SettingOption.DISABLE_SHOW_PAGE_STATS]: boolean,
    [SettingOption.DISABLE_SHOW_CONTEXT_MENU]: boolean,
    [SettingOption.ALLOWLIST_DOMAINS]: string,
    [SettingOption.INVERTED_ALLOWLIST_DOMAINS]: string,

    [SettingOption.FILTERS_STATE_PROP]?: string,
    [SettingOption.FILTERS_VERSION_PROP]?: string,
    [SettingOption.GROUPS_STATE_PROP]?: string,

    [SettingOption.METADATA]?: string,
    [SettingOption.I18N_METADATA]?: string,

    [SettingOption.CUSTOM_FILTERS]?: string,

    [SettingOption.PAGE_STATISTIC]?: string,

    [SettingOption.LAST_NOTIFICATION_TIME]?: number,
    [SettingOption.VIEWED_NOTIFICATIONS]?: string[],

    [SettingOption.SB_LRU_CACHE]?: string,
    [SettingOption.SB_SUSPENDED_CACHE]?: number,
};

function isPromoInfoDisabled(): boolean {
    return (!UserAgent.isWindows && !UserAgent.isMacOs) || UserAgent.isEdge;
}

function genClientId() {
    const result = [];
    const suffix = (Date.now()) % 1e8;
    const symbols = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz01234567890';
    for (let i = 0; i < 8; i += 1) {
        const symbol = symbols[Math.floor(Math.random() * symbols.length)];
        result.push(symbol);
    }
    return result.join('') + suffix;
}

export const defaultSettings: Settings = {
    [SettingOption.CLIENT_ID]: genClientId(),
    [SettingOption.APP_VERSION]: browser.runtime.getManifest().version,
    [SettingOption.DISABLE_SHOW_ADGUARD_PROMO_INFO]: isPromoInfoDisabled(),
    [SettingOption.DISABLE_SAFEBROWSING]: true,
    [SettingOption.DISABLE_COLLECT_HITS]: true,
    [SettingOption.DEFAULT_ALLOWLIST_MODE]: true,
    [SettingOption.ALLOWLIST_ENABLED]: true,
    [SettingOption.USE_OPTIMIZED_FILTERS]: UserAgent.isAndroid,
    [SettingOption.DISABLE_DETECT_FILTERS]: false,
    [SettingOption.DISABLE_SHOW_APP_UPDATED_NOTIFICATION]: false,
    [SettingOption.FILTERS_UPDATE_PERIOD]: DEFAULT_FILTERS_UPDATE_PERIOD,
    [SettingOption.DISABLE_STEALTH_MODE]: true,
    [SettingOption.HIDE_REFERRER]: true,
    [SettingOption.HIDE_SEARCH_QUERIES]: true,
    [SettingOption.SEND_DO_NOT_TRACK]: true,
    [SettingOption.BLOCK_CHROME_CLIENT_DATA]: UserAgent.isChrome,
    [SettingOption.BLOCK_WEBRTC]: false,
    [SettingOption.SELF_DESTRUCT_THIRD_PARTY_COOKIES]: true,
    [SettingOption.SELF_DESTRUCT_THIRD_PARTY_COOKIES_TIME]: DEFAULT_THIRD_PARTY_COOKIES_SELF_DESTRUCT_MIN,
    [SettingOption.SELF_DESTRUCT_FIRST_PARTY_COOKIES]: false,
    [SettingOption.SELF_DESTRUCT_FIRST_PARTY_COOKIES_TIME]: DEFAULT_FIRST_PARTY_COOKIES_SELF_DESTRUCT_MIN,
    [SettingOption.APPEARANCE_THEME]: AppearanceTheme.SYSTEM,
    [SettingOption.USER_FILTER_ENABLED]: true,
    [SettingOption.HIDE_RATE_BLOCK]: false,
    [SettingOption.USER_RULES_EDITOR_WRAP]: false,
    [SettingOption.DISABLE_FILTERING]: false,
    [SettingOption.DISABLE_SHOW_PAGE_STATS]: false,
    [SettingOption.DISABLE_SHOW_CONTEXT_MENU]: false,
    [SettingOption.ALLOWLIST_DOMAINS]: JSON.stringify(DEFAULT_ALLOWLIST),
    [SettingOption.INVERTED_ALLOWLIST_DOMAINS]: JSON.stringify(DEFAULT_INVERTED_ALLOWLIST),
};
