import { storage } from '../../storage';
import { UserAgent } from '../../../common/user-agent';
import {
    Settings,
    SettingOption,
    DEFAULT_FILTERS_UPDATE_PERIOD,
    DEFAULT_FIRST_PARTY_COOKIES_SELF_DESTRUCT_MIN,
    DEFAULT_THIRD_PARTY_COOKIES_SELF_DESTRUCT_MIN,
    ADGUARD_SETTINGS_KEY,
    AppearanceTheme,
    SettingsBackup,
} from '../../../common/settings';

export class SettingsStorage {
    /**
     * Computed values are declared in this object instead constructor,
     * because default settings called by reset method
     */
    static defaultSettings: Settings = {
        [SettingOption.CLIENT_ID]: SettingsStorage.genClientId(),

        // user settings
        [SettingOption.DISABLE_SHOW_ADGUARD_PROMO_INFO]: SettingsStorage.isPromoInfoDisabled(),
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
    };

    settings = SettingsStorage.defaultSettings;

    isInit = false;

    async init() {
        const settings = await storage.get(ADGUARD_SETTINGS_KEY) as Partial<Settings>;

        /**
         * set defaults on first run
         */
        if (!settings) {
            await storage.set(ADGUARD_SETTINGS_KEY, SettingsStorage.defaultSettings);
            return;
        }

        /**
         * Use Object.assign to prevent setting fields mismatch,
         * when partial data stored
         */
        this.settings = { ...SettingsStorage.defaultSettings, ...settings };

        await storage.set(ADGUARD_SETTINGS_KEY, settings);

        this.isInit = true;
    }

    async set<T extends SettingOption>(key: T, value: Settings[T]): Promise<void> {
        this.settings[key] = value;

        await storage.set(ADGUARD_SETTINGS_KEY, this.settings);
    }

    get<T extends SettingOption>(key: T): Settings[T] {
        return this.settings[key];
    }

    async remove<T extends SettingOption>(key: T) {
        delete this.settings[key];

        await storage.set(ADGUARD_SETTINGS_KEY, this.settings);
    }

    getData() {
        return {
            names: SettingOption,
            defaultValues: SettingsStorage.defaultSettings,
            values: this.settings,
        };
    }

    async reset() {
        this.settings = SettingsStorage.defaultSettings;
        await storage.set(ADGUARD_SETTINGS_KEY, SettingsStorage.defaultSettings);
    }

    getConfiguration() {
        return {
            collectStats: !this.settings[SettingOption.DISABLE_COLLECT_HITS],
            allowlistInverted: !this.settings[SettingOption.DEFAULT_ALLOWLIST_MODE],
            allowlistEnabled: this.settings[SettingOption.ALLOWLIST_ENABLED],
            stealthModeEnabled: !this.settings[SettingOption.DISABLE_STEALTH_MODE],
            filteringEnabled: !this.settings[SettingOption.DISABLE_FILTERING],
            stealth: {
                blockChromeClientData: this.settings[SettingOption.BLOCK_CHROME_CLIENT_DATA],
                hideReferrer: this.settings[SettingOption.HIDE_REFERRER],
                hideSearchQueries: this.settings[SettingOption.HIDE_SEARCH_QUERIES],
                sendDoNotTrack: this.settings[SettingOption.SEND_DO_NOT_TRACK],
                blockWebRTC: this.settings[SettingOption.BLOCK_WEBRTC],
                selfDestructThirdPartyCookies: this.settings[SettingOption.SELF_DESTRUCT_THIRD_PARTY_COOKIES],
                selfDestructThirdPartyCookiesTime: this.settings[SettingOption.SELF_DESTRUCT_THIRD_PARTY_COOKIES_TIME],
                selfDestructFirstPartyCookies: this.settings[SettingOption.SELF_DESTRUCT_FIRST_PARTY_COOKIES],
                selfDestructFirstPartyCookiesTime: this.settings[SettingOption.SELF_DESTRUCT_FIRST_PARTY_COOKIES_TIME],
            },
        };
    }

    async importSettings(backup: SettingsBackup) {
        const stealthSettings = backup['stealth'];

        if (stealthSettings) {
            // set "block webrtc" setting as soon as possible. AG-9980
        // don't set the actual value to avoid requesting permissions
            if (this.settings[SettingOption.BLOCK_WEBRTC] !== !!stealthSettings['stealth-block-webrtc']) {
                this.settings[SettingOption.BLOCK_WEBRTC] = !!stealthSettings['stealth-block-webrtc'];
            }

            this.settings[SettingOption.DISABLE_STEALTH_MODE] = !!stealthSettings['stealth_disable_stealth_mode'];
            this.settings[SettingOption.HIDE_REFERRER] = !!stealthSettings['stealth-hide-referrer'];
            this.settings[SettingOption.HIDE_SEARCH_QUERIES] = !!stealthSettings['stealth-hide-search-queries'];
            this.settings[SettingOption.SEND_DO_NOT_TRACK] = !!stealthSettings['stealth-send-do-not-track'];
            this.settings[SettingOption.BLOCK_CHROME_CLIENT_DATA] = !!stealthSettings['stealth-remove-x-client'];
            this.settings[SettingOption.SELF_DESTRUCT_THIRD_PARTY_COOKIES] = !!stealthSettings[
                'stealth-block-third-party-cookies'
            ];

            if (stealthSettings['stealth-block-third-party-cookies-time']) {
                this.settings[SettingOption.SELF_DESTRUCT_THIRD_PARTY_COOKIES_TIME] = stealthSettings[
                    'stealth-block-third-party-cookies-time'
                ];
            }

            this.settings[SettingOption.SELF_DESTRUCT_FIRST_PARTY_COOKIES] = !!stealthSettings[
                'stealth-block-first-party-cookies'
            ];

            if (stealthSettings['stealth-block-first-party-cookies-time']) {
                this.settings[SettingOption.SELF_DESTRUCT_FIRST_PARTY_COOKIES_TIME] = stealthSettings[
                    'stealth-block-third-party-cookies-time'
                ];
            }
        }

        const generalSettings = backup['general-settings'];

        if (generalSettings) {
            this.settings[SettingOption.DISABLE_SHOW_PAGE_STATS] = !!generalSettings['show-blocked-ads-count'];
            this.settings[SettingOption.DISABLE_DETECT_FILTERS] = !!generalSettings['autodetect-filters'];
            this.settings[SettingOption.DISABLE_SAFEBROWSING] = !!generalSettings['safebrowsing-enabled'];

            if (generalSettings['filters-update-period']) {
                this.settings[SettingOption.FILTERS_UPDATE_PERIOD] = generalSettings['filters-update-period'];
            }

            if (generalSettings['appearance-theme'] === AppearanceTheme.DARK
            || generalSettings['appearance-theme'] === AppearanceTheme.LIGHT
            || generalSettings['appearance-theme'] === AppearanceTheme.SYSTEM
            ) {
                this.settings[SettingOption.APPEARANCE_THEME] = generalSettings['appearance-theme'];
            }
        }

        const extensionSpecificSettings = backup['extension-specific-settings'];

        if (extensionSpecificSettings) {
            this.settings[SettingOption.USE_OPTIMIZED_FILTERS] = !!extensionSpecificSettings['use-optimized-filters'];
            this.settings[SettingOption.DISABLE_COLLECT_HITS] = !extensionSpecificSettings['collect-hits-count'];
            this.settings[SettingOption.DISABLE_SHOW_CONTEXT_MENU] = !extensionSpecificSettings['show-context-menu'];
            this.settings[SettingOption.DISABLE_SHOW_ADGUARD_PROMO_INFO] = !extensionSpecificSettings[
                'show-info-about-adguard'
            ];
            this.settings[SettingOption.DISABLE_SHOW_APP_UPDATED_NOTIFICATION] = !extensionSpecificSettings[
                'show-app-updated-info'
            ];

            this.settings[SettingOption.HIDE_RATE_BLOCK] = !!extensionSpecificSettings['hide-rate-adguard'];
            this.settings[SettingOption.USER_RULES_EDITOR_WRAP] = !!extensionSpecificSettings['user-rules-editor-wrap'];
        }

        await storage.set(ADGUARD_SETTINGS_KEY, this.settings);
    }

    private static isPromoInfoDisabled(): boolean {
        return (!UserAgent.isWindows && !UserAgent.isMacOs) || UserAgent.isEdge;
    }

    private static genClientId() {
        const result = [];
        const suffix = (Date.now()) % 1e8;
        const symbols = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz01234567890';
        for (let i = 0; i < 8; i += 1) {
            const symbol = symbols[Math.floor(Math.random() * symbols.length)];
            result.push(symbol);
        }
        return result.join('') + suffix;
    }
}

export const settingsStorage = new SettingsStorage();
