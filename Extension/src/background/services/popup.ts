import browser from 'webextension-polyfill';

import {
    defaultFilteringLog,
    FilteringEventType,
    ApplyBasicRuleEvent,
    tabsApi,
    isHttpRequest,
    getDomain,
} from '@adguard/tswebextension';

import { MessageType } from '../../common/messages';
import { messageHandler } from '../message-handler';
import { SettingOption } from '../../common/settings';
import { AntiBannerFiltersId } from '../../common/constants';
import { UserAgent } from '../../common/user-agent';
import { Engine } from '../engine';
import { settingsStorage } from '../storages';
import { PageStatsApi, SettingsApi, notificationApi } from '../api';

import { UiService } from './ui';

export class PopupService {
    static init() {
        messageHandler.addListener(MessageType.GET_TAB_INFO_FOR_POPUP, PopupService.getTabInfoForPopup);
        messageHandler.addListener(
            MessageType.CHANGE_APPLICATION_FILTERING_DISABLED,
            PopupService.onChangeFilteringDisable,
        );

        defaultFilteringLog.addEventListener(FilteringEventType.APPLY_BASIC_RULE, PopupService.onBasicRuleApply);
    }

    static async getTabInfoForPopup({ data }) {
        const { tabId } = data;

        return {
            frameInfo: PopupService.getMainFrameInfo(tabId),
            stats: PageStatsApi.getStatisticsData(),
            settings: SettingsApi.getData(),
            options: {
                showStatsSupported: true,
                isFirefoxBrowser: UserAgent.isFirefox,
                showInfoAboutFullVersion: !settingsStorage.get(SettingOption.DISABLE_SHOW_ADGUARD_PROMO_INFO),
                isMacOs: UserAgent.isMacOs,
                isEdgeBrowser: UserAgent.isEdge || UserAgent.isEdgeChromium,
                notification: notificationApi.getCurrentNotification(),
                isDisableShowAdguardPromoInfo: settingsStorage.get(SettingOption.DISABLE_SHOW_ADGUARD_PROMO_INFO),
                hasCustomRulesToReset: false, // TODO,
            },
        };
    }

    static async onBasicRuleApply({ data }: ApplyBasicRuleEvent) {
        const { rule, tabId } = data;

        const blockedCountIncrement = 1;

        PageStatsApi.updateStats(rule.getFilterListId(), blockedCountIncrement);
        PageStatsApi.incrementTotalBlocked(blockedCountIncrement);
        UiService.debounceUpdateTabIcon(tabId);
    }

    private static async onChangeFilteringDisable({ data }) {
        const { state: disabled } = data;

        settingsStorage.set(SettingOption.DISABLE_FILTERING, disabled);

        await Engine.update();

        const currentTab = (await browser.tabs.query({ active: true, currentWindow: true }))[0];

        await browser.tabs.reload(currentTab.id);
    }

    /**
    * Gets main frame popup data
    */
    private static getMainFrameInfo(tabId: number) {
        const tabContext = tabsApi.getTabContext(tabId);

        const { frames, metadata } = tabContext;

        const { blockedRequestCount, mainFrameRule } = metadata;

        const url = frames.get(0)?.url;

        const urlFilteringDisabled = !isHttpRequest(url);

        // TODO: check storage init ?
        // application is available for tabs where url is with http schema
        const applicationAvailable = !urlFilteringDisabled;

        let documentAllowlisted = false;
        let userAllowlisted = false;
        let canAddRemoveRule = false;
        let frameRule: { filterId: number, ruleText: string } | undefined;

        const adguardProductName = '';

        const totalBlocked = PageStatsApi.getTotalBlocked();

        const totalBlockedTab = blockedRequestCount || 0;
        const applicationFilteringDisabled = settingsStorage.get(SettingOption.DISABLE_FILTERING);

        if (applicationAvailable) {
            documentAllowlisted = !!mainFrameRule && mainFrameRule.isAllowlist();
            if (documentAllowlisted) {
                const rule = mainFrameRule;

                const filterId = rule.getFilterListId();

                userAllowlisted = filterId === AntiBannerFiltersId.USER_FILTER_ID
                       || filterId === AntiBannerFiltersId.ALLOWLIST_FILTER_ID;

                frameRule = {
                    filterId,
                    ruleText: rule.getText(),
                };
            }
            // It means site in exception
            canAddRemoveRule = !(documentAllowlisted && !userAllowlisted);
        }

        const domainName = getDomain(url);

        return {
            url,
            applicationAvailable,
            domainName,
            applicationFilteringDisabled,
            urlFilteringDisabled,
            documentAllowlisted,
            userAllowlisted,
            canAddRemoveRule,
            frameRule,
            adguardProductName,
            totalBlockedTab,
            totalBlocked,
        };
    }
}
