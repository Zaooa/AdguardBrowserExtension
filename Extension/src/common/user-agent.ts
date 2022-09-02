/**
 * helper class for user agent data
 *
 * Use bowser UA string parser because User Agent Client Hints API is not supported by FF
 * https://developer.mozilla.org/en-US/docs/Web/API/User-Agent_Client_Hints_API#browser_compatibility
 */
export class UserAgent {
    static browserDataMap = {
        'Chrome': {
            brand: 'Google Chrome',
            uaStringName: 'Chrome',
        },
        'Firefox': {
            brand: undefined,
            uaStringName: 'Firefox',
        },
        'Safari': {
            brand: undefined,
            uaStringName: 'Safari',
        },
        'Opera': {
            brand: 'Opera',
            uaStringName: 'OPR',
        },
        'YaBrowser': {
            brand: 'Yandex',
            uaStringName: 'YaBrowser',
        },
        'Edge': {
            brand: undefined,
            uaStringName: 'edge',
        },
        'EdgeChromium': {
            brand: 'Microsoft Edge',
            uaStringName: 'edg',
        },
    };

    static getBrowserName(): string | null {
        const brandsData = navigator?.userAgentData?.brands;

        const browserDataEntries = Object.entries(UserAgent.browserDataMap);

        for (let i = 0; i < browserDataEntries.length; i += 1) {
            const [name, data] = browserDataEntries[i];

            if (brandsData?.some((brandData) => brandData.brand === data.brand)) {
                return name;
            }

            if (navigator.userAgent.indexOf(data.uaStringName) >= 0) {
                return name;
            }
        }

        return null;
    }

    /**
     * Check if current browser is as given
     */
    static isTargetBrowser(browserName: string): boolean {
        const brand = UserAgent.browserDataMap[browserName]?.brand;
        const uaStringName = UserAgent.browserDataMap[browserName]?.uaStringName;

        const brandsData = navigator?.userAgentData?.brands;

        if (!brandsData || !brand) {
            return navigator.userAgent.indexOf(uaStringName) >= 0;
        }

        for (let i = 0; i < brandsData.length; i += 1) {
            const data = brandsData[i];

            if (data.brand === brand) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if current platform is as given
     */
    static isTargetPlatform(platformName: string): boolean {
        const platformString = navigator?.userAgentData?.platform;

        return platformString
            ? platformString.toUpperCase().indexOf(platformName) >= 0
            : navigator.userAgent.toUpperCase().indexOf(platformName) >= 0;
    }

    /**
     * Get browser version by name
     * @param {string} browserName
     * @returns {number|null}
     */
    static getBrowserVersion(browserName: string): number | null {
        let brand: string;
        let uaStringMask: RegExp | undefined;

        if (browserName === 'Chrome') {
            brand = 'Google Chrome';
            uaStringMask = /\sChrome\/(\d+)\./;
        } else if (browserName === 'Firefox') {
            uaStringMask = /\sFirefox\/(\d+)\./;
        }

        const brandsData = navigator?.userAgentData?.brands;

        if (!brandsData || !brand) {
            const match = uaStringMask ? uaStringMask.exec(navigator.userAgent) : null;
            return match === null ? null : Number.parseInt(match[1], 10);
        }

        for (let i = 0; i < brandsData.length; i += 1) {
            const data = brandsData[i];

            if (data.brand === brand) {
                const { version } = data;
                return Number.parseInt(version, 10);
            }
        }

        return null;
    }

    static isChrome = UserAgent.isTargetBrowser('Chrome');

    static isFirefox = UserAgent.isTargetBrowser('Firefox');

    static isOpera = UserAgent.isTargetBrowser('Opera');

    static isYandex = UserAgent.isTargetBrowser('YaBrowser');

    static isEdge = UserAgent.isTargetBrowser('Edge');

    static isEdgeChromium = UserAgent.isTargetBrowser('EdgeChromium');

    static chromeVersion = UserAgent.getBrowserVersion('Chrome');

    static firefoxVersion = UserAgent.getBrowserVersion('Firefox');

    static operaVersion = UserAgent.getBrowserVersion('Opera');

    static isMacOs = UserAgent.isTargetPlatform('MAC');

    static isWindows = UserAgent.isTargetPlatform('WIN');

    static isAndroid = UserAgent.isTargetPlatform('ANDROID');

    static isSupportedBrowser = (UserAgent.isChrome && UserAgent.chromeVersion >= 79)
        || (UserAgent.isFirefox && UserAgent.firefoxVersion >= 78)
        || (UserAgent.isOpera && UserAgent.operaVersion >= 66);

    static browserName = UserAgent.getBrowserName();
}
