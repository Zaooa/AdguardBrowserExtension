import { SettingOption } from '../../common/settings';
import { StringStorage } from '../utils/string-storage';
import { settingsStorage } from './settings';

export const invertedAllowlistDomainsStorage = new StringStorage<SettingOption, string[]>(
    SettingOption.INVERTED_ALLOWLIST_DOMAINS,
    settingsStorage,
);
