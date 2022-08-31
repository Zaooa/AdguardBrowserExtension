import { SettingOption } from '../../common/settings';
import { StringStorage } from '../utils/string-storage';
import { settingsStorage } from './settings';

export const pageStatsStorage = new StringStorage<SettingOption.PAGE_STATISTIC, string[]>(
    SettingOption.PAGE_STATISTIC,
    settingsStorage,
);
