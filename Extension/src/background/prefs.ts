import browser from 'webextension-polyfill';

/**
 * Extension global preferences
 */
export class Prefs {
    public static id = browser.runtime.id;

    public static baseUrl = browser.runtime.getURL('');

    public static scheme = Prefs.baseUrl.split('://')[0];

    public static version = browser.runtime.getManifest().version;
}
