/* eslint-disable no-console */
import browser, { Runtime } from 'webextension-polyfill';

import { MessageType } from '../common/messages';
import { log } from '../common/log';
import { SettingOption } from '../common/settings';

import { messageHandler } from './message-handler';
import { Engine } from './engine';
import { settingsStorage } from './storages';
import {
    SettingsApi,
    toasts,
    CommonFilterApi,
    PagesApi,
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

/**
 * App entry point
 */
export class App {
    private isFirstInstall = false;

    private isUpdated = false;

    static uninstallUrl = Forward.get({
        action: ForwardAction.UNINSTALL_EXTENSION,
        from: ForwardFrom.BACKGROUND,
    });

    constructor() {
        this.onInstall = this.onInstall.bind(this);
    }

    /**
     * Initializes all app services
     * and handle webextension API events for first install and update scenario
     */
    async init() {
        /**
         * Initializes message handler as soon as possible to prevent connection errors from extension pages
         */
        messageHandler.init();

        /**
         * Handles app start reason (first install or update)
         * TODO: sync check
         */
        browser.runtime.onInstalled.addListener(this.onInstall);

        /**
         * Initializes App data:
         *
         * - Initializes setting storage. If some fields are not exist, sets default values
         * - Loads app metadata on first initialization and caches it in nested storage
         * - Initializes nested storages for userrules, allowlist, custom filters metadata and page-stats
         * - Initializes nested storages for filters state, groups state and filters versions, based on app metadata
         */
        await SettingsApi.init();

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
        if (this.isFirstInstall) {
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
        if (this.isUpdated) {
            const prevVersion = settingsStorage.get(SettingOption.APP_VERSION);
            const currentVersion = browser.runtime.getManifest().version;

            settingsStorage.set(SettingOption.APP_VERSION, currentVersion);

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
     * Handles install reason from browser.runtime.onInstalled
     */
    private async onInstall({ reason }: Runtime.OnInstalledDetailsType) {
        if (reason === 'install') {
            this.isFirstInstall = true;
        }

        if (reason === 'update') {
            this.isUpdated = true;
        }
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
