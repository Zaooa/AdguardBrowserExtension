import { LRUMap } from 'lru_map';
import { SettingOption } from '../../common/settings';
import { LruCache } from '../utils/lru-cache';
import { settingsStorage } from './settings';

export const sbCache = new LruCache<SettingOption.SB_LRU_CACHE, string, string>(
    SettingOption.SB_LRU_CACHE,
    settingsStorage,
);

export const sbRequestCache = new LRUMap(1000);
