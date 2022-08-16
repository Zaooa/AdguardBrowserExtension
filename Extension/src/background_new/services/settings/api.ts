import { AntiBannerFiltersId } from '../../../common/constants';
import {
    settingsBackupValidator,
} from '../../../common/settings';
import { FiltersApi } from '../filters/api';
import { filtersState } from '../filters/filters-state';

import { settingsStorage } from './storage';

export class SettingsApi {
    static async importSettings(text: string): Promise<boolean> {
        try {
            const json = JSON.parse(text);
            const settingsBackup = settingsBackupValidator.parse(json);

            await settingsStorage.importSettings(settingsBackup);

            if (settingsBackup?.['general-settings']?.['allow-acceptable-ads']) {
                await FiltersApi.loadAndEnableFilters([AntiBannerFiltersId.SEARCH_AND_SELF_PROMO_FILTER_ID]);
            } else {
                await filtersState.disableFilters([AntiBannerFiltersId.SEARCH_AND_SELF_PROMO_FILTER_ID]);
            }

            if (settingsBackup?.stealth?.['strip-tracking-parameters']) {
                await FiltersApi.loadAndEnableFilters([AntiBannerFiltersId.URL_TRACKING_FILTER_ID]);
            } else {
                await filtersState.disableFilters([AntiBannerFiltersId.URL_TRACKING_FILTER_ID]);
            }

            // TODO: another sections
            return true;
        } catch (e) {
            console.log(e);
            return false;
        }
    }
}
