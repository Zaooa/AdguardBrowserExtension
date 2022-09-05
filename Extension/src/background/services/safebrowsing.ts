import browser, { WebRequest } from 'webextension-polyfill';
import { RequestType } from '@adguard/tsurlfilter';
import { RequestData, RequestEvents } from '@adguard/tswebextension';
import { SafebrowsingApi } from '../api/safebrowsing';
import { SettingsService } from './settings';
import { SettingOption } from '../../common/settings';

export class SafebrowsingService {
    static init() {
        SafebrowsingApi.initCache();

        SettingsService.onSettingChange.addListener(
            SettingOption.DISABLE_SAFEBROWSING,
            SafebrowsingApi.clearCache,
        );

        RequestEvents.onHeadersReceived.addListener(SafebrowsingService.onHeaderReceived);
    }

    private static onHeaderReceived({ context }: RequestData<WebRequest.OnHeadersReceivedDetailsType>) {
        const {
            requestType,
            statusCode,
            requestUrl,
            referrerUrl,
            tabId,
        } = context;

        if (requestType === RequestType.Document && statusCode !== 301 && statusCode !== 302) {
            SafebrowsingApi
                .checkSafebrowsingFilter(requestUrl, referrerUrl)
                .then((safebrowsingUrl) => {
                    browser.tabs.update(tabId, { url: safebrowsingUrl });
                })
                .catch(() => {});
        }
    }
}
