import { TsWebExtension, ConfigurationMV2, MESSAGE_HANDLER_NAME } from '@adguard/tswebextension';
import { FiltersStorage } from './services/filters/filters-storage';
import { SettingsService } from './services/settings';
import { log } from '../common/log';
import { listeners } from './notifier';
import { FiltersApi } from './services/filters/api';
import { AllowlistApi } from './services/filters/allowlist';
import { UserRulesApi } from './services/filters/userrules';

export type { Message as EngineMessage } from '@adguard/tswebextension';

export class Engine {
    static api = new TsWebExtension('web-accessible-resources');

    static messageHandlerName = MESSAGE_HANDLER_NAME;

    static messageHandler = Engine.api.getMessageHandler();

    static async start() {
        const configuration = await Engine.getConfiguration();

        log.info('Start tswebextension...');
        await Engine.api.start(configuration);

        const rulesCount = Engine.api.getRulesCount();
        log.info(`tswebextension is started. Rules count: ${rulesCount}`);
        listeners.notifyListeners(listeners.REQUEST_FILTER_UPDATED, {
            rulesCount,
        });
    }

    static async update() {
        const configuration = await Engine.getConfiguration();

        log.info('Update tswebextension configuration...');
        await Engine.api.configure(configuration);

        const rulesCount = Engine.api.getRulesCount();
        log.info(`tswebextension configuration is updated. Rules count: ${rulesCount}`);
        listeners.notifyListeners(listeners.REQUEST_FILTER_UPDATED, {
            rulesCount,
        });
    }

    /**
     * Creates tswebextension configuration based on current app state
     */
    private static async getConfiguration(): Promise<ConfigurationMV2> {
        const enabledFilters = FiltersApi.getEnabledFilters();

        const filters = [];

        const tasks = enabledFilters.map(async (filterId) => {
            const rules = await FiltersStorage.get(filterId);

            const trusted = FiltersApi.isFilterTrusted(filterId);

            const rulesTexts = rules.join('\n');

            filters.push({
                filterId,
                content: rulesTexts,
                trusted,
            });
        });

        await Promise.all(tasks);

        const settings = SettingsService.getConfiguration();

        let allowlist = [];

        if (AllowlistApi.isEnabled()) {
            if (settings.allowlistInverted) {
                allowlist = AllowlistApi.getInvertedAllowlistDomains();
            } else {
                allowlist = AllowlistApi.getAllowlistDomains();
            }
        }

        let userrules = [];

        if (UserRulesApi.isEnabled()) {
            userrules = await UserRulesApi.getUserRules();

            /**
             * remove empty strings
             */
            userrules = userrules.filter(rule => !!rule);

            /**
             * remove duplicates
             */
            userrules = Array.from(new Set(userrules));
        }

        return {
            verbose: false,
            filters,
            userrules,
            allowlist,
            settings,
        };
    }
}
