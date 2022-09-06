/* eslint-disable no-console */
import browser from 'webextension-polyfill';

import { MessageType } from '../common/messages';
import { log } from '../common/log';
import {
    ADGUARD_SETTINGS_KEY, defaultSettings, genClientId, SettingOption, Settings,
} from '../common/settings';

import { messageHandler } from './message-handler';
import { Engine } from './engine';
import { settingsStorage, storage } from './storages';
import {
    toasts,
    CommonFilterApi,
    PagesApi,
    FiltersApi,
} from './api';
import {
    UiService,
    PopupService,
    SettingsService,
    FiltersService,
    AllowlistService,
    UserRulesService,
    CustomFilterService,
    FilteringLogService,
    eventService,
    SafebrowsingService,
    localeDetect,
    NotificationService,
} from './services';
import {
    Forward,
    ForwardAction,
    ForwardFrom,
} from '../common/forward';

import { Prefs } from './prefs';

/**
 * App entry point
 */
export class App {
    static uninstallUrl = Forward.get({
        action: ForwardAction.UNINSTALL_EXTENSION,
        from: ForwardFrom.BACKGROUND,
    });

    /**
     * Initializes all app services
     * and handle webextension API events for first install and update scenario
     */
    static async init() {
        /**
         * Initializes message handler as soon as possible to prevent connection errors from extension pages
         */
        messageHandler.init();

        /**
         * Get persisted settings from browser.storage.local
         */
        const settings = await storage.get(ADGUARD_SETTINGS_KEY) as Partial<Settings | undefined>;

        /**
         * Checks if app initialized first time or updated
         */
        const prevVersion = settings?.[SettingOption.APP_VERSION];
        const currentVersion = Prefs.version;

        const isVersionChanged = prevVersion !== currentVersion;

        const isFirstRun = isVersionChanged && !prevVersion;
        const isUpdate = isVersionChanged && prevVersion;

        /**
         * Set settings
         *
         * Use Object.assign to prevent setting fields mismatch,
         * when partial data stored
         *
         * Force rewrite app data
         */
        settingsStorage.setSettings({
            ...defaultSettings,
            ...settings,
            [SettingOption.APP_VERSION]: currentVersion,
            [SettingOption.CLIENT_ID]: settings?.[SettingOption.CLIENT_ID] || genClientId(),
        });

        /**
         * Initializes Filters data:
         * - Loads app i18n metadata and caches it in i18n-metadata storage
         * - Loads app metadata, apply localization from i18n-metadata storage and caches it in metadata storage
         * - Initializes storages for userrules, allowlist, custom filters metadata and page-stats
         * - Initializes storages for filters state, groups state and filters versions, based on app metadata
         */
        await FiltersApi.init();

        /**
         * Initializes app notifications:
         * - Initializes notifications storage
         * - Adds listeners for notification events
         */
        NotificationService.init();

        /**
         * Adds listeners for settings events
         */
        SettingsService.init();

        /**
         * Adds listeners for filter and group state events (enabling, updates)
         */
        await FiltersService.init();

        /**
         * Adds listeners specified for custom filters
         */
        await CustomFilterService.init();

        /**
         * Adds listeners for allowlist events
         */
        await AllowlistService.init();

        /**
         * Adds listeners for userrules list events
         */
        await UserRulesService.init();

        /**
         * Adds listeners for filtering log
         */
        FilteringLogService.init();

        /**
         * Adds listeners for managing ui
         * (routing between extension pages, toasts, icon update)
         */
        await UiService.init();

        /**
         * Adds listeners for popup events
         */
        PopupService.init();

        /**
         * Initializes language detector for auto-enabling relevant filters
         */
        localeDetect.init();

        /**
         * Adds listener for creating `notifier` events. Triggers by frontend
         *
         * TODO: delete after frontend refactoring
         */
        eventService.init();

        /**
         * Initializes Safebrowsing module
         * - Initializes persisted lru cache for hashes
         * - Adds listener for filtering web requests
         * - Adds listener for safebrowsing settings option switcher
         */
        SafebrowsingService.init();

        /**
         * Sets app uninstall url
         */
        await App.setUninstallUrl();

        /**
         * First install additional scenario
         */
        if (isFirstRun) {
            /**
             * Adds engine status listener for filters-download page
             */
            messageHandler.addListener(MessageType.CHECK_REQUEST_FILTER_READY, App.onCheckRequestFilterReady);

            /**
             * Opens filters-download page
             */
            await PagesApi.openFiltersDownloadPage();

            /**
             * Loads default filters
             */
            await CommonFilterApi.initDefaultFilters();
        }

        /**
         * Update additional scenario
         */
        if (isUpdate) {
            if (!settingsStorage.get(SettingOption.DISABLE_SHOW_APP_UPDATED_NOTIFICATION)) {
                toasts.showApplicationUpdatedPopup(currentVersion, prevVersion);
            }
        }

        /**
         * Runs tswebextension
         */
        await Engine.start();
    }

    /**
     * Handles engine status request from filters-download page
     */
    private static onCheckRequestFilterReady() {
        const ready = Engine.api.isStarted;

        /**
         * If engine is ready, user will be redirected to thankyou page.
         *
         * CHECK_REQUEST_FILTER_READY listener is not needed anymore
         */
        if (ready) {
            messageHandler.removeListener(MessageType.CHECK_REQUEST_FILTER_READY);
        }

        return { ready };
    }

    /**
     * Sets app uninstall url
     */
    private static async setUninstallUrl() {
        try {
            await browser.runtime.setUninstallURL(App.uninstallUrl);
        } catch (e) {
            log.error(e);
        }
    }
}

export const app = new App();
