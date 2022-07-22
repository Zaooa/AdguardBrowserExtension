import { AntiBannerFiltersId } from '../../../../common/constants';
import { FiltersStorage } from '../filters-storage';
import { settingsStorage } from '../../settings';
import { SettingOption } from '../../../../common/settings';
import { listeners } from '../../../notifier';

export class UserRulesApi {
    static async init() {
        const userRules = await FiltersStorage.get(AntiBannerFiltersId.USER_FILTER_ID);

        if (!userRules) {
            await FiltersStorage.set(AntiBannerFiltersId.USER_FILTER_ID, []);
        }
    }

    /**
     * Checks, if user list is enabled
     * @returns
     */
    static isEnabled() {
        return settingsStorage.get(SettingOption.USER_FILTER_ENABLED);
    }

    /**
     * Returns user rules from stroage
     */
    static async getUserRules() {
        return FiltersStorage.get(AntiBannerFiltersId.USER_FILTER_ID);
    }

    /**
     * Add user rule to storage
     */
    static async addUserRule(rule: string) {
        const userRules = await UserRulesApi.getUserRules();

        userRules.push(rule);

        await UserRulesApi.setUserRules(userRules);
    }

    static async removeUserRule(rule: string) {
        const userRules = await UserRulesApi.getUserRules();

        await UserRulesApi.setUserRules(userRules.filter(r => r !== rule));
    }

    /**
     * Set user rule list to storage
     */
    static async setUserRules(rules: string[]) {
        /**
         * remove empty strings
         */
        rules = rules.filter(domain => !!domain);

        /**
         * remove duplicates
         */
        rules = Array.from(new Set(rules));

        await FiltersStorage.set(AntiBannerFiltersId.USER_FILTER_ID, rules);

        listeners.notifyListeners(listeners.USER_FILTER_UPDATED);
    }
}
