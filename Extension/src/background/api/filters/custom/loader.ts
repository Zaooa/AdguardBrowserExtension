import { network } from '../../network';

/**
 * Helper class for custom filters downloading
 */
export class CustomFilterLoader {
    /**
     * Custom filter downloading limit in ms
     */
    private static DOWNLOAD_LIMIT_MS = 3 * 1000;

    /**
     * Limits filter download with timeout
     */
    public static async downloadRulesWithTimeout(url: string) {
        return Promise.race([
            network.downloadFilterRulesBySubscriptionUrl(url),
            new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Fetch timeout is over')), CustomFilterLoader.DOWNLOAD_LIMIT_MS);
            }),
        ]);
    }
}
