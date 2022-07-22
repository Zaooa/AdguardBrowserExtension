/* eslint-disable no-console */
import browser, { Runtime } from 'webextension-polyfill';
import { messageHandler } from './message-handler';
import { Engine } from './engine';
import { MessageType } from '../common/messages';
import { log } from '../common/log';
import { UiService } from './services/ui-service';
import { PopupService } from './services/popup-service';
import { SettingsService } from './services/settings';
import { FiltersService } from './services/filters/service';
import { FiltersApi } from './services/filters/api';
import { AllowlistService } from './services/filters/allowlist/service';
import { UserRulesService } from './services/filters/userrules';
import { CustomFilterService } from './services/filters/custom/service';
import { FilteringLogService } from './services/filtering-log';
import { eventService } from './services/event-service';
import { safebrowsingService } from './services/safebrowsing-service';

export class App {
    private isFirstInstall = false;

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

        await SettingsService.init();
        await FiltersService.init();
        await CustomFilterService.init();
        await AllowlistService.init();
        await UserRulesService.init();
        FilteringLogService.init();
        UiService.init();
        PopupService.init();
        eventService.init();
        safebrowsingService.init();
        await App.setUninstallUrl();

        if (this.isFirstInstall) {
            messageHandler.addListener(MessageType.CHECK_REQUEST_FILTER_READY, App.onCheckRequestFilterReady);
            await UiService.openFiltersDownloadPage();
            await FiltersApi.initDefaultFilters();
        }

        await Engine.start();
    }

    private async onInstall({ reason }: Runtime.OnInstalledDetailsType) {
        if (reason === 'install') {
            this.isFirstInstall = true;
        }
    }

    private static async onCheckRequestFilterReady() {
        const ready = Engine.api.isStarted;

        if (ready) {
            messageHandler.removeListener(MessageType.CHECK_REQUEST_FILTER_READY);
        }

        return Promise.resolve({ ready });
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
