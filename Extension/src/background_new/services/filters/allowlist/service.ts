import { tabsApi, getHost } from '@adguard/tswebextension';
import browser from 'webextension-polyfill';
import {
    MessageType,
    SaveAllowlistDomainsMessage,
} from '../../../../common/constants';
import { messageHandler } from '../../../message-handler';
import { Engine } from '../../../engine';
import { SettingsService } from '../../settings';
import { SettingOption } from '../../../../common/settings';
import { AllowlistApi } from './api';

export class AllowlistService {
    static async init() {
        await AllowlistApi.init();

        messageHandler.addListener(MessageType.GET_ALLOWLIST_DOMAINS, AllowlistService.onGetAllowlistDomains);
        messageHandler.addListener(MessageType.SAVE_ALLOWLIST_DOMAINS, AllowlistService.handleDomainsSave);
        messageHandler.addListener(MessageType.ADD_ALLOWLIST_DOMAIN_POPUP, AllowlistService.onAddAllowlistDomain);
        messageHandler.addListener(MessageType.REMOVE_ALLOWLIST_DOMAIN, AllowlistService.onRemoveAllowlistDomain);

        SettingsService.onSettingChange.addListener(
            SettingOption.ALLOWLIST_ENABLED,
            AllowlistService.onEnableStateChange,
        );

        SettingsService.onSettingChange.addListener(
            SettingOption.DEFAULT_ALLOWLIST_MODE,
            AllowlistService.onAllowlistModeChange,
        );
    }

    static async onGetAllowlistDomains() {
        const domains = AllowlistApi.isInverted()
            ? AllowlistApi.getInvertedAllowlistDomains()
            : AllowlistApi.getAllowlistDomains();

        const content = domains.join('\n');

        return { content, appVersion: browser.runtime.getManifest().version };
    }

    static async onAddAllowlistDomain(message) {
        const { tabId } = message.data;

        const mainFrame = tabsApi.getTabMainFrame(tabId);

        if (!mainFrame?.url) {
            return;
        }

        const domain = getHost(mainFrame.url);

        if (AllowlistApi.isInverted()) {
            AllowlistApi.removeInvertedAllowlistDomain(domain);
        } else {
            AllowlistApi.addAllowlistDomain(domain);
        }

        await Engine.update();

        await browser.tabs.reload(tabId);
    }

    static async onRemoveAllowlistDomain(message) {
        const { tabId } = message.data;

        const mainFrame = tabsApi.getTabMainFrame(tabId);

        if (!mainFrame?.url) {
            return;
        }

        const domain = getHost(mainFrame.url);

        if (AllowlistApi.isInverted()) {
            AllowlistApi.addInvertedAllowlistDomain(domain);
        } else {
            AllowlistApi.removeAllowlistDomain(domain);
        }

        await Engine.update();

        await browser.tabs.reload(tabId);
    }

    static async handleDomainsSave(message: SaveAllowlistDomainsMessage) {
        const { value } = message.data;

        const domains = value.split(/[\r\n]+/);

        if (AllowlistApi.isInverted()) {
            AllowlistApi.setInvertedAllowlistDomains(domains);
        } else {
            AllowlistApi.setAllowlistDomains(domains);
        }

        await Engine.update();
    }

    static async onEnableStateChange() {
        await Engine.update();
    }

    static async onAllowlistModeChange() {
        await Engine.update();
    }
}
