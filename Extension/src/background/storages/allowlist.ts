import { SettingOption } from '../../common/settings';
import { StringStorage } from '../utils/string-storage';
import { settingsStorage } from './settings';

export const allowlistDomainsStorage = new StringStorage<SettingOption, string[]>(
    SettingOption.ALLOWLIST_DOMAINS,
    settingsStorage,
);
