import { SettingOption } from '../../common/settings';
import { LruCache } from '../utils/lru-cache';
import { settingsStorage } from './settings';

export const safebrowsingCache = new LruCache<SettingOption.SB_LRU_CACHE, string, string>(
    SettingOption.SB_LRU_CACHE,
    settingsStorage,
);
