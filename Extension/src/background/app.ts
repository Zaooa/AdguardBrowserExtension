/* eslint-disable no-console */
import browser, { Runtime } from 'webextension-polyfill';

import { MessageType } from '../common/messages';
import { log } from '../common/log';
import { SettingOption } from '../common/settings';

import { messageHandler } from './message-handler';
import { Engine } from './engine';
import { settingsStorage } from './storages';
import { SettingsApi, toasts, CommonFilterApi } from './api';
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
    safebrowsingService,
} from './services';

export class App {
    private isFirstInstall = false;

    private isUpdated = false;

    // eslint-disable-next-line max-len
    static uninstallUrl = 'https://adguard.com/forward.html?action=adguard_uninstal_ext&from=background&app=browser_extension';

    constructor() {
        this.onInstall = this.onInstall.bind(this);
    }

    async init() {
        /**
         * init message handler as soon as possible to prevent connection errors from extension pages
         */
        messageHandler.init();

        browser.runtime.onInstalled.addListener(this.onInstall);

        await SettingsApi.init();

        await SettingsService.init();
        await FiltersService.init();
        await CustomFilterService.init();
        await AllowlistService.init();
        await UserRulesService.init();
        FilteringLogService.init();
        await UiService.init();
        PopupService.init();
        eventService.init();
        safebrowsingService.init();
        await App.setUninstallUrl();

        if (this.isFirstInstall) {
            messageHandler.addListener(MessageType.CHECK_REQUEST_FILTER_READY, App.onCheckRequestFilterReady);
            await UiService.openFiltersDownloadPage();
            await CommonFilterApi.initDefaultFilters();
        }

        if (this.isUpdated) {
            const prevVersion = settingsStorage.get(SettingOption.APP_VERSION);
            const currentVersion = browser.runtime.getManifest().version;

            settingsStorage.set(SettingOption.APP_VERSION, currentVersion);

            if (!settingsStorage.get(SettingOption.DISABLE_SHOW_APP_UPDATED_NOTIFICATION)) {
                toasts.showApplicationUpdatedPopup(currentVersion, prevVersion);
            }
        }

        await Engine.start();
    }

    private async onInstall({ reason }: Runtime.OnInstalledDetailsType) {
        if (reason === 'install') {
            this.isFirstInstall = true;
        }

        if (reason === 'update') {
            this.isUpdated = true;
        }
    }

    private static onCheckRequestFilterReady() {
        const ready = Engine.api.isStarted;

        if (ready) {
            messageHandler.removeListener(MessageType.CHECK_REQUEST_FILTER_READY);
        }

        return { ready };
    }

    private static async setUninstallUrl() {
        try {
            await browser.runtime.setUninstallURL(App.uninstallUrl);
        } catch (e) {
            log.error(e);
        }
    }
}

export const app = new App();
