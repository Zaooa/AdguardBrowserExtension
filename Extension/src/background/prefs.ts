import browser from 'webextension-polyfill';

/**
 * Extension global preferences
 */
export class Prefs {
    public static baseUrl = browser.runtime.getURL('');

    public static scheme = Prefs.baseUrl.split('://')[0];
}
