import { AntiBannerFiltersId } from '../../../../common/constants';
import { FiltersStorage } from '../filters-storage';
import { settingsStorage } from '../../settings';
import { SettingOption } from '../../../../common/settings';
import { listeners } from '../../../notifier';
import { editorStorage } from './editor-storage';

/**
 * Api for managing user rules list
 */
export class UserRulesApi {
    /**
     * Parse data from user rules list
     * If it's undefined, sets empty user rules list
     */
    static async init() {
        const userRules = await FiltersStorage.get(AntiBannerFiltersId.USER_FILTER_ID);

        if (!userRules) {
            await FiltersStorage.set(AntiBannerFiltersId.USER_FILTER_ID, []);
        }
    }

    /**
     * Checks, if user list is enabled
     */
    static isEnabled() {
        return settingsStorage.get(SettingOption.USER_FILTER_ENABLED);
    }

    /**
     * Returns rules from user list
     */
    static async getUserRules() {
        return FiltersStorage.get(AntiBannerFiltersId.USER_FILTER_ID);
    }

    /**
     * Add rule to user list
     */
    static async addUserRule(rule: string) {
        const userRules = await UserRulesApi.getUserRules();

        userRules.push(rule);

        await UserRulesApi.setUserRules(userRules);
    }

    /**
     * Remove rule from user list
     */
    static async removeUserRule(rule: string) {
        const userRules = await UserRulesApi.getUserRules();

        await UserRulesApi.setUserRules(userRules.filter(r => r !== rule));
    }

    /**
     * Set user rule list to storage
     */
    static async setUserRules(rules: string[]) {
        await FiltersStorage.set(AntiBannerFiltersId.USER_FILTER_ID, rules);

        listeners.notifyListeners(listeners.USER_FILTER_UPDATED);
    }

    /**
     * Get persisted rules during switches between common and fullscreen modes
     */
    static getEditorStorageData(): string | undefined {
        return editorStorage.get();
    }

    /**
     * Set persisted rules during switches between common and fullscreen modes
     */
    static setEditorStorageData(data: string): void {
        editorStorage.set(data);
    }
}
