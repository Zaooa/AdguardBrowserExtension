import { debounce } from 'lodash';
import browser from 'webextension-polyfill';
import { isHttpRequest, tabsApi } from '@adguard/tswebextension';

import { messageHandler } from '../message-handler';
import {
    MessageType,
    OpenAbuseTabMessage,
    OpenSiteReportTabMessage,
} from '../../common/messages';
import { UserAgent } from '../../common/user-agent';
import { Engine } from '../engine';
import { settingsStorage } from '../storages';
import { SettingOption } from '../../common/settings';
import { AntiBannerFiltersId, BACKGROUND_TAB_ID } from '../../common/constants';
import { listeners } from '../notifier';

import {
    toasts,
    FiltersApi,
    TabsApi,
    getIconImageData,
    SettingsApi,
    notificationApi,
    PagesApi,
} from '../api';

// TODO: decompose
export class UiService {
    static async init() {
        await toasts.init();

        messageHandler.addListener(MessageType.OPEN_TAB, TabsApi.openTab);

        messageHandler.addListener(MessageType.OPEN_SETTINGS_TAB, PagesApi.openSettingsPage);
        messageHandler.addListener(MessageType.OPEN_FILTERING_LOG, PagesApi.openFilteringLogPage);
        messageHandler.addListener(MessageType.OPEN_ABUSE_TAB, UiService.openAbusePage);
        messageHandler.addListener(MessageType.OPEN_SITE_REPORT_TAB, UiService.openSiteReportPage);
        messageHandler.addListener(MessageType.OPEN_THANKYOU_PAGE, PagesApi.openThankYouPage);
        messageHandler.addListener(MessageType.OPEN_EXTENSION_STORE, PagesApi.openExtensionStorePage);
        messageHandler.addListener(MessageType.OPEN_COMPARE_PAGE, PagesApi.openComparePage);
        messageHandler.addListener(MessageType.OPEN_FULLSCREEN_USER_RULES, PagesApi.openFullscreenUserRulesPage);
        messageHandler.addListener(
            MessageType.ADD_FILTERING_SUBSCRIPTION,
            PagesApi.openSettingsPageWithCustomFilterModal,
        );

        messageHandler.addListener(MessageType.OPEN_ASSISTANT, UiService.openAssistant);
        messageHandler.addListener(MessageType.INITIALIZE_FRAME_SCRIPT, UiService.initializeFrameScriptRequest);

        tabsApi.onUpdate.subscribe((tab) => {
            UiService.debounceUpdateTabIcon(tab.info.id);
        });

        tabsApi.onActivated.subscribe((tab) => {
            UiService.debounceUpdateTabIcon(tab.info.id);
        });
    }

    static async openAbusePage({ data }: OpenAbuseTabMessage): Promise<void> {
        const { url, from } = data;

        await PagesApi.openAbusePage(url, from);
    }

    static async openSiteReportPage({ data }: OpenSiteReportTabMessage): Promise<void> {
        const { url } = data;

        await PagesApi.openSiteReportPage(url);
    }

    static async openAssistant(): Promise<void> {
        const activeTab = await TabsApi.findOne({ active: true });
        Engine.api.openAssistant(activeTab.id);
    }

    static initializeFrameScriptRequest() {
        const enabledFilters = {};
        Object.values(AntiBannerFiltersId).forEach((filterId) => {
            const enabled = FiltersApi.isFilterEnabled(Number(filterId));
            if (enabled) {
                enabledFilters[filterId] = true;
            }
        });

        return {
            userSettings: SettingsApi.getData(),
            enabledFilters,
            filtersMetadata: FiltersApi.getFiltersMetadata(),
            requestFilterInfo: {
                rulesCount: Engine.api.getRulesCount(),
            },
            environmentOptions: {
                isMacOs: UserAgent.isMacOs,
                canBlockWebRTC: true, // TODO
                isChrome: UserAgent.isChrome,
                Prefs: {
                    locale: browser.i18n.getUILanguage(),
                    mobile: UserAgent.isAndroid,
                },
                appVersion: browser.runtime.getManifest().version,
            },
            constants: {
                AntiBannerFiltersId,
                EventNotifierTypes: listeners.events,
            },
        };
    }

    static debounceUpdateTabIcon(tabId: number) {
        debounce(() => UiService.updateTabIcon(tabId), 100)();
    }

    static async updateTabIcon(tabId: number) {
        let icon: Record<string, string>;
        let badge: string;
        let badgeColor = '#555';

        if (tabId === BACKGROUND_TAB_ID) {
            return;
        }

        try {
            let blocked: number;
            let disabled: boolean;

            const tabContext = tabsApi.getTabContext(tabId);

            if (!tabContext) {
                return;
            }

            const { frames, metadata } = tabContext;

            const { blockedRequestCount, mainFrameRule } = metadata;

            const mainFrame = frames.get(0);

            disabled = !isHttpRequest(mainFrame?.url);
            disabled = disabled || (!!mainFrameRule && mainFrameRule.isAllowlist());
            disabled = disabled || settingsStorage.get(SettingOption.DISABLE_FILTERING);

            if (!disabled && !settingsStorage.get(SettingOption.DISABLE_SHOW_PAGE_STATS)) {
                blocked = blockedRequestCount || 0;
            } else {
                blocked = 0;
            }

            if (disabled) {
                icon = {
                    '19': browser.runtime.getURL('assets/icons/gray-19.png'),
                    '38': browser.runtime.getURL('assets/icons/gray-38.png'),
                };
            } else {
                icon = {
                    '19': browser.runtime.getURL('assets/icons/green-19.png'),
                    '38': browser.runtime.getURL('assets/icons/green-38.png'),
                };
            }

            if (blocked === 0) {
                badge = '';
            } else if (blocked > 99) {
                badge = '\u221E';
            } else {
                badge = String(blocked);
            }

            // If there's an active notification, indicate it on the badge
            const notification = notificationApi.getCurrentNotification();
            if (notification) {
                badge = notification.badgeText || badge;
                badgeColor = notification.badgeBgColor || badgeColor;

                if (notification.icons) {
                    if (disabled) {
                        icon = notification.icons.ICON_GRAY;
                    } else {
                        icon = notification.icons.ICON_GREEN;
                    }
                }
            }

            await browser.browserAction.setIcon({ tabId, imageData: await getIconImageData(icon) });

            if (badge) {
                await browser.browserAction.setBadgeText({ tabId, text: badge });
                await browser.browserAction.setBadgeBackgroundColor({ tabId, color: badgeColor });
            }
        } catch (e) {
            // do nothing
        }
    }
}
