import browser from 'webextension-polyfill';
import { UserAgent } from '../../../common/user-agent';
import {
    Forward,
    ForwardAction,
    ForwardFrom,
    ForwardParams,
} from '../../../common/forward';
import { Engine } from '../../engine';
import { UrlUtils } from '../../utils/url';
import { settingsStorage } from '../../storages';
import { SettingOption } from '../../../common/settings';
import { BrowserUtils } from '../../utils/browser-utils';
import { AntiBannerFiltersId } from '../../../common/constants';

import { TabsApi } from '../extension';
import { Prefs } from '../../prefs';

export class PagesApi {
    public static settingsUrl = PagesApi.getExtensionPageUrl('options.html');

    public static filteringLogUrl = PagesApi.getExtensionPageUrl('filtering-log.html');

    public static filtersDownloadPageUrl = PagesApi.getExtensionPageUrl('filter-download.html');

    public static thankYouPageUrl = Forward.get({
        action: ForwardAction.THANK_YOU,
        from: ForwardFrom.BACKGROUND,
    });

    public static comparePageUrl = Forward.get({
        action: ForwardAction.COMPARE,
        from: ForwardFrom.OPTIONS,
    });

    public static extensionStoreUrl = PagesApi.getExtensionStoreUrl();

    static async openSettingsPage(): Promise<void> {
        await TabsApi.openTab({
            focusIfOpen: true,
            url: PagesApi.settingsUrl,
        });
    }

    static async openFullscreenUserRulesPage(): Promise<void> {
        const theme = settingsStorage.get(SettingOption.APPEARANCE_THEME);
        const url = PagesApi.getExtensionPageUrl(`fullscreen-user-rules.html?theme=${theme}`);

        await TabsApi.openWindow({
            url,
            type: 'popup',
            focused: true,
            state: 'fullscreen',
        });
    }

    static async openFilteringLogPage(): Promise<void> {
        const activeTab = (await browser.tabs.query({ currentWindow: true, active: true }))[0];

        const url = PagesApi.filteringLogUrl + (activeTab.id ? `#${activeTab.id}` : '');

        await TabsApi.openWindow({
            focusIfOpen: true,
            url,
            type: 'popup',
        });
    }

    static async openAbusePage(siteUrl: string, from: ForwardFrom): Promise<void> {
        let { browserName } = UserAgent;
        let browserDetails: string | null;

        if (!UserAgent.isSupportedBrowser) {
            browserDetails = browserName;
            browserName = 'Other';
        }

        const filterIds = Engine.api.configuration.filters;

        const params: ForwardParams = {
            action: ForwardAction.REPORT,
            from,
            product_type: 'Ext',
            product_version: encodeURIComponent(browser.runtime.getManifest().version),
            browser: encodeURIComponent(browserName),
            url: encodeURIComponent(siteUrl),
        };

        if (browserDetails) {
            params.browser_detail = encodeURIComponent(browserDetails);
        }

        if (filterIds.length > 0) {
            params.filters = encodeURIComponent(filterIds.join('.'));
        }

        Object.assign(
            params,
            PagesApi.getStealthParams(filterIds),
            PagesApi.getBrowserSecurityParams(),
        );

        const reportUrl = Forward.get(params);

        await TabsApi.openTab({
            url: reportUrl,
        });
    }

    static async openSiteReportPage(siteUrl: string): Promise<void> {
        const domain = UrlUtils.getDomainName(siteUrl);

        if (!domain) {
            return;
        }

        const punycodeDomain = UrlUtils.toPunyCode(domain);

        await TabsApi.openTab({
            url: Forward.get({
                action: ForwardAction.SITE_REPORT,
                from: ForwardFrom.CONTEXT_MENU,
                domain: encodeURIComponent(punycodeDomain),
            }),
        });
    }

    public static getExtensionPageUrl(path: string) {
        return `${Prefs.baseUrl}pages/${path}`;
    }

    public static async openFiltersDownloadPage() {
        await TabsApi.openTab({ url: PagesApi.filtersDownloadPageUrl });
    }

    public static async openComparePage() {
        await TabsApi.openTab({ url: PagesApi.comparePageUrl });
    }

    public static async openThankYouPage() {
        const params = BrowserUtils.getExtensionParams();
        params.push(`_locale=${encodeURIComponent(browser.i18n.getUILanguage())}`);
        const thankYouUrl = `${PagesApi.thankYouPageUrl}?${params.join('&')}`;

        const filtersDownloadPage = await TabsApi.findOne({ url: PagesApi.filtersDownloadPageUrl });

        if (filtersDownloadPage) {
            await browser.tabs.update(filtersDownloadPage.id, { url: thankYouUrl });
        } else {
            await browser.tabs.create({ url: thankYouUrl });
        }
    }

    public static async openExtensionStorePage() {
        await TabsApi.openTab({ url: PagesApi.extensionStoreUrl });
    }

    private static getExtensionStoreUrl() {
        let action = ForwardAction.CHROME_STORE;

        if (UserAgent.isOpera) {
            action = ForwardAction.OPERA_STORE;
        } else if (UserAgent.isFirefox) {
            action = ForwardAction.FIREFOX_STORE;
        } else if (UserAgent.isEdge) {
            action = ForwardAction.EDGE_STORE;
        }

        return Forward.get({
            action,
            from: ForwardFrom.OPTIONS,
        });
    }

    public static async openSettingsPageWithCustomFilterModal(message): Promise<void> {
        const { url, title } = message.data;

        let path = 'options.html#filters?group=0';
        if (title) {
            path += `&title=${title}`;
        }
        path += `&subscribe=${encodeURIComponent(url)}`;

        path = PagesApi.getExtensionPageUrl(path);

        await TabsApi.openTab({
            focusIfOpen: true,
            url: path,
        });
    }

    private static getBrowserSecurityParams(): { [key: string]: string } {
        const isEnabled = !settingsStorage.get(SettingOption.DISABLE_SAFEBROWSING);
        return { 'browsing_security.enabled': String(isEnabled) };
    }

    private static getStealthParams(filterIds: number[]): { [key: string]: string } {
        const stealthEnabled = !settingsStorage.get(SettingOption.DISABLE_STEALTH_MODE);

        if (!stealthEnabled) {
            return { 'stealth.enabled': 'false' };
        }

        const stealthOptions = [
            {
                queryKey: 'stealth.ext_hide_referrer',
                settingKey: SettingOption.HIDE_REFERRER,
            },
            {
                queryKey: 'stealth.hide_search_queries',
                settingKey: SettingOption.HIDE_SEARCH_QUERIES,
            },
            {
                queryKey: 'stealth.DNT',
                settingKey: SettingOption.SEND_DO_NOT_TRACK,
            },
            {
                queryKey: 'stealth.x_client',
                settingKey: SettingOption.BLOCK_CHROME_CLIENT_DATA,
            },
            {
                queryKey: 'stealth.webrtc',
                settingKey: SettingOption.BLOCK_WEBRTC,
            },
            {
                queryKey: 'stealth.third_party_cookies',
                settingKey: SettingOption.SELF_DESTRUCT_THIRD_PARTY_COOKIES,
                settingValueKey: SettingOption.SELF_DESTRUCT_THIRD_PARTY_COOKIES_TIME,
            },
            {
                queryKey: 'stealth.first_party_cookies',
                settingKey: SettingOption.SELF_DESTRUCT_FIRST_PARTY_COOKIES,
                settingValueKey: SettingOption.SELF_DESTRUCT_FIRST_PARTY_COOKIES_TIME,
            },
        ];

        const stealthOptionsEntries = [['stealth.enabled', 'true']];

        for (let i = 0; i < stealthOptions.length; i += 1) {
            const { queryKey, settingKey, settingValueKey } = stealthOptions[i];

            const setting = settingsStorage.get(settingKey);

            if (!setting) {
                continue;
            }

            let option: string;

            if (!settingValueKey) {
                option = String(setting);
            } else {
                option = String(settingsStorage.get(settingValueKey));
            }

            stealthOptionsEntries.push([queryKey, option]);
        }

        const isRemoveUrlParamsEnabled = filterIds.includes(AntiBannerFiltersId.URL_TRACKING_FILTER_ID);

        if (isRemoveUrlParamsEnabled) {
            stealthOptionsEntries.push(['stealth.strip_url', 'true']);
        }

        return Object.fromEntries(stealthOptionsEntries);
    }
}
