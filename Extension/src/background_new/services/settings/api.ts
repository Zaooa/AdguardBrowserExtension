import {
    SettingsBackup,
} from '../../../common/settings';
import { FiltersApi } from '../filters/api';

import { settingsStorage } from './storage';

export class SettingsApi {
    static async reset(): Promise<void> {
        await settingsStorage.reset();
        await FiltersApi.reset();
    }

    static async import(settingsBackup: SettingsBackup) {
        try {
            await settingsStorage.import(settingsBackup);
            await FiltersApi.import(settingsBackup);
            return true;
        } catch (e) {
            return false;
        }
    }
}
