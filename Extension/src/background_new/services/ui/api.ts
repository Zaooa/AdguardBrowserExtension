import browser, { Tabs } from 'webextension-polyfill';

export class UiApi {
    static baseUrl = browser.runtime.getURL('/');

    static isExtensionTab(tab: Tabs.Tab): boolean {
        const { url } = tab;

        if (!url) {
            return false;
        }

        let urlProtocol: string;

        try {
            urlProtocol = new URL(url).protocol;
        } catch (e) {
            return false;
        }

        const extensionProtocol = new URL(UiApi.baseUrl).protocol;

        return urlProtocol.indexOf(extensionProtocol) > -1;
    }
}
