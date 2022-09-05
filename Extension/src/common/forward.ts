export const enum ForwardAction {
    UNINSTALL_EXTENSION = 'adguard_uninstal_ext',
    THANK_YOU = 'thank_you_page',
    SITE_REPORT = 'site_report_page',
    REPORT = 'report',
    PRIVACY = 'privacy',
    ACKNOWLEDGMENTS = 'acknowledgments',
    GITHUB = 'github_options',
    WEBSITE = 'adguard_site',
    DISCUSS = 'discuss',
    COMPARE = 'compare',
    CHANGELOG = 'github_version_popup',
    GLOBAL_PRIVACY_CONTROL = 'global_privacy_control',
    DO_NOT_TRACK = 'do_not_track',
    HOW_TO_CREATE_RULES = 'userfilter_description',
    ADGUARD_SITE = 'adguard_site',
    SELF_PROMOTION = 'self_promotion',
    PROTECTION_WORKS = 'protection_works',
    COLLECT_HITS_LEARN_MORE = 'filter_rules',
    OPERA_STORE = 'opera_store',
    FIREFOX_STORE = 'firefox_store',
    CHROME_STORE = 'chrome_store',
    EDGE_STORE = 'edge_store',
    IOS = 'ios_about',
    ANDROID = 'android_about',
}

export const enum ForwardFrom {
    BACKGROUND = 'background',
    OPTIONS = 'options_screen',
    OPTIONS_FOOTER = 'options_screen_footer',
    CONTEXT_MENU = 'context_menu',
    POPUP = 'popup',
    SAFEBROWSING = 'safebrowsing',
    ADBLOCKED = 'adblocked',
}

export const enum ForwardApp {
    BROWSER_EXTENSION = 'browser_extension',
}

export type ForwardParams = {
    action: ForwardAction;
    from?: ForwardFrom;
    app?: ForwardApp;
    [key: string] : string;
};

/**
 * Class for creating forward links
 */
export class Forward {
    static url = 'https://link.adtidy.org/forward.html';

    static defaultParams = {
        app: ForwardApp.BROWSER_EXTENSION,
    };

    static get(params: ForwardParams): string {
        const queryString = Object
            .entries({ ...Forward.defaultParams, ...params })
            .map(([key, value]) => `${key}=${value}`).join('&');

        return `${Forward.url}?${queryString}`;
    }
}
