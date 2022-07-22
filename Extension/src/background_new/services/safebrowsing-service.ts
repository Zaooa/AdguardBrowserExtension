import browser from 'webextension-polyfill';
import { RequestEvents } from '@adguard/tswebextension';
import safebrowsing from './filters/safebrowsing';

export class SafebrowsingService {
    constructor() {
        this.onHeaderReceived = this.onHeaderReceived.bind(this);
    }

    init() {
        RequestEvents.onHeadersReceived.addListener(this.onHeaderReceived);
    }

    // eslint-disable-next-line class-methods-use-this
    onHeaderReceived({ details }) {
        const {
            type,
            statusCode,
            url,
            tabId,
            originUrl,
        } = details;

        if (type === 'main_frame' && statusCode !== 301 && statusCode !== 302) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            this.filterUrl(tabId, url, originUrl);
        }
    }

    // eslint-disable-next-line class-methods-use-this
    async filterUrl(tabId: number, url: string, originUrl: string) {
        const safebrowsingUrl = await safebrowsing.checkSafebrowsingFilter(url, originUrl);

        if (!safebrowsingUrl) {
            return;
        }

        await browser.tabs.update(tabId, { url: safebrowsingUrl });
    }
}

export const safebrowsingService = new SafebrowsingService();
