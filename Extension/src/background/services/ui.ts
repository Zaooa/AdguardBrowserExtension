import { debounce } from 'lodash';
import browser from 'webextension-polyfill';
import { isHttpRequest, tabsApi } from '@adguard/tswebextension';

import { messageHandler } from '../message-handler';
import { MessageType, OpenAbuseTabMessage, OpenSiteReportTabMessage } from '../../common/messages';
import { UserAgent } from '../../common/user-agent';
import { Engine } from '../engine';
import { UrlUtils } from '../utils/url';
import { settingsStorage } from '../storages';
import { SettingOption } from '../../common/settings';
import { BrowserUtils } from '../utils/browser-utils';
import { AntiBannerFiltersId, BACKGROUND_TAB_ID } from '../../common/constants';
import { listeners } from '../notifier';
import {
    toasts,
    FiltersApi,
    TabsApi,
    getIconImageData,
    SettingsApi,
    notificationApi,
} from '../api';

// TODO: decompose
export class UiService {
    static baseUrl = browser.runtime.getURL('/');

    static settingsUrl = UiService.getExtensionPageUrl('options.html');

    static filteringLogUrl = UiService.getExtensionPageUrl('filtering-log.html');

    static filtersDownloadPageUrl = UiService.getExtensionPageUrl('filter-download.html');

    static thankYouPageUrl = 'https://welcome.adguard.com/v2/thankyou.html';

    static comparePageUrl = 'https://adguard.com/forward.html?action=compare&from=options_screen&app=browser_extension';

    static extensionStoreUrl = UiService.getExtensionStoreUrl();

    static async init() {
        await toasts.init();

        messageHandler.addListener(MessageType.OPEN_SETTINGS_TAB, UiService.openSettingsTab);
        messageHandler.addListener(MessageType.OPEN_FILTERING_LOG, UiService.openFilteringLog);
        messageHandler.addListener(MessageType.OPEN_ABUSE_TAB, UiService.openAbuseTab);
        messageHandler.addListener(MessageType.OPEN_SITE_REPORT_TAB, UiService.openSiteReportTab);
        messageHandler.addListener(MessageType.OPEN_ASSISTANT, UiService.openAssistant);
        messageHandler.addListener(MessageType.ADD_FILTERING_SUBSCRIPTION, UiService.openCustomFilterModal);
        messageHandler.addListener(MessageType.OPEN_THANKYOU_PAGE, UiService.openThankYouPage);
        messageHandler.addListener(MessageType.OPEN_EXTENSION_STORE, UiService.openExtensionStore);
        messageHandler.addListener(MessageType.OPEN_COMPARE_PAGE, UiService.openComparePage);
        messageHandler.addListener(MessageType.OPEN_FULLSCREEN_USER_RULES, UiService.openFullscreenUserRules);
        messageHandler.addListener(MessageType.INITIALIZE_FRAME_SCRIPT, UiService.initializeFrameScriptRequest);

        tabsApi.onUpdate.subscribe((tab) => {
            UiService.debounceUpdateTabIcon(tab.info.id);
        });

        tabsApi.onActivated.subscribe((tab) => {
            UiService.debounceUpdateTabIcon(tab.info.id);
        });
    }

    // listeners

    static async openSettingsTab(): Promise<void> {
        const settingTab = await TabsApi.findOne({ url: UiService.settingsUrl });

        if (settingTab) {
            await TabsApi.focus(settingTab);
        } else {
            await browser.tabs.create({ url: UiService.settingsUrl });
        }
    }

    static async openFullscreenUserRules(): Promise<void> {
        const theme = settingsStorage.get(SettingOption.APPEARANCE_THEME);
        const url = UiService.getExtensionPageUrl(`fullscreen-user-rules.html?theme=${theme}`);

        await browser.windows.create({
            url,
            type: 'popup',
            focused: true,
            state: 'fullscreen',
        });
    }

    static async openFilteringLog(): Promise<void> {
        const activeTab = (await browser.tabs.query({ currentWindow: true, active: true }))[0];

        const url = UiService.filteringLogUrl + (activeTab.id ? `#${activeTab.id}` : '');

        const filteringLogTab = await TabsApi.findOne({ url });

        if (filteringLogTab) {
            await TabsApi.focus(filteringLogTab);
        } else {
            await browser.windows.create({ url, type: 'popup' });
        }
    }

    static async openAbuseTab({ data }: OpenAbuseTabMessage): Promise<void> {
        const { url } = data;

        let { browserName } = UserAgent;
        let browserDetails: string | undefined;

        if (!UserAgent.isSupportedBrowser) {
            browserDetails = browserName;
            browserName = 'Other';
        }

        const filterIds = Engine.api.configuration.filters;

        await browser.tabs.create({
            url: `https://reports.adguard.com/new_issue.html?product_type=Ext&product_version=${
                encodeURIComponent(browser.runtime.getManifest().version)
            }&browser=${encodeURIComponent(browserName)
            }${browserDetails ? `&browser_detail=${encodeURIComponent(browserDetails)}` : ''
            }&url=${encodeURIComponent(url)
            }${filterIds.length > 0 ? `&filters=${encodeURIComponent(filterIds.join('.'))}` : ''
            }${UiService.getStealthString(filterIds)
            }${UiService.getBrowserSecurityString()}`,
        });
    }

    static async openSiteReportTab({ data }: OpenSiteReportTabMessage): Promise<void> {
        const { url } = data;

        const domain = UrlUtils.getDomainName(url);

        if (!domain) {
            return;
        }

        const punycodeDomain = UrlUtils.toPunyCode(domain);

        await browser.tabs.create({
            // eslint-disable-next-line max-len
            url: `https://adguard.com/site.html?domain=${encodeURIComponent(punycodeDomain)}&utm_source=extension&aid=16593`,
        });
    }

    static async openAssistant(): Promise<void> {
        const activeTab = await TabsApi.findOne({ active: true });
        Engine.api.openAssistant(activeTab.id);
    }

    static async openCustomFilterModal(message): Promise<void> {
        const { url, title } = message.data;

        let path = 'options.html#filters?group=0';
        if (title) {
            path += `&title=${title}`;
        }
        path += `&subscribe=${encodeURIComponent(url)}`;

        path = UiService.getExtensionPageUrl(path);

        const activeTab = await TabsApi.findOne({ url: path });

        if (activeTab) {
            await TabsApi.focus(activeTab);
        } else {
            await browser.tabs.create({ url: path });
        }
    }

    static async openFiltersDownloadPage() {
        await browser.tabs.create({ url: UiService.filtersDownloadPageUrl });
    }

    static async openComparePage() {
        await browser.tabs.create({ url: UiService.comparePageUrl });
    }

    static async openThankYouPage() {
        const params = BrowserUtils.getExtensionParams();
        params.push(`_locale=${encodeURIComponent(browser.i18n.getUILanguage())}`);
        const thankYouUrl = `${UiService.thankYouPageUrl}?${params.join('&')}`;

        const filtersDownloadPageTab = (await browser.tabs.query({
            url: UiService.filtersDownloadPageUrl,
        }))[0];

        if (filtersDownloadPageTab) {
            await browser.tabs.update(filtersDownloadPageTab.id, { url: thankYouUrl });
        } else {
            await browser.tabs.create({ url: thankYouUrl });
        }
    }

    static async openExtensionStore() {
        await browser.tabs.create({ url: UiService.extensionStoreUrl });
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

    // helpers

    static getExtensionPageUrl(path: string) {
        return `${UiService.baseUrl}pages/${path}`;
    }

    static getBrowserSecurityString(): string {
        const isEnabled = !settingsStorage.get(SettingOption.DISABLE_SAFEBROWSING);
        return `&browsing_security.enabled=${isEnabled}`;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static getStealthString(filterIds: number[]): string {
        const stealthEnabled = !settingsStorage.get(SettingOption.DISABLE_STEALTH_MODE);

        if (!stealthEnabled) {
            return '&stealth.enabled=false';
        }
        const stealthOptions = [
            {
                queryKey: 'ext_hide_referrer',
                settingKey: SettingOption.HIDE_REFERRER,
            },
            {
                queryKey: 'hide_search_queries',
                settingKey: SettingOption.HIDE_SEARCH_QUERIES,
            },
            {
                queryKey: 'DNT',
                settingKey: SettingOption.SEND_DO_NOT_TRACK,
            },
            {
                queryKey: 'x_client',
                settingKey: SettingOption.BLOCK_CHROME_CLIENT_DATA,
            },
            {
                queryKey: 'webrtc',
                settingKey: SettingOption.BLOCK_WEBRTC,
            },
            {
                queryKey: 'third_party_cookies',
                settingKey: SettingOption.SELF_DESTRUCT_THIRD_PARTY_COOKIES,
                settingValueKey: SettingOption.SELF_DESTRUCT_THIRD_PARTY_COOKIES_TIME,
            },
            {
                queryKey: 'first_party_cookies',
                settingKey: SettingOption.SELF_DESTRUCT_FIRST_PARTY_COOKIES,
                settingValueKey: SettingOption.SELF_DESTRUCT_FIRST_PARTY_COOKIES_TIME,
            },
        ];

        const stealthOptionsString = stealthOptions.map((option) => {
            const { queryKey, settingKey, settingValueKey } = option;
            const setting = settingsStorage.get(settingKey);
            let settingString: string;
            if (!setting) {
                return '';
            }
            if (!settingValueKey) {
                settingString = setting.toString();
            } else {
                settingString = settingsStorage.get(settingValueKey).toString();
            }
            return `stealth.${queryKey}=${encodeURIComponent(settingString)}`;
        })
            .filter(string => string.length > 0)
            .join('&');

        // TODO: implement when filters service will be created)
        // https://github.com/AdguardTeam/AdguardBrowserExtension/issues/1937
        /*
        const isRemoveUrlParamsEnabled = filterIds.includes(AntiBannerFiltersId.URL_TRACKING_FILTER_ID);
        if (isRemoveUrlParamsEnabled) {
            stealthOptionsString = `${stealthOptionsString}&stealth.strip_url=true`;
        }
        */

        return `&stealth.enabled=true&${stealthOptionsString}`;
    }

    static getExtensionStoreUrl() {
        let browserName = 'chrome';

        if (UserAgent.isOpera) {
            browserName = 'opera';
        } else if (UserAgent.isFirefox) {
            browserName = 'firefox';
        } else if (UserAgent.isEdge) {
            browserName = 'edge';
        }

        const action = `${browserName}_store`;

        return `https://adguard.com/forward.html?action=${action}&from=options_screen&app=browser_extension`;
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
