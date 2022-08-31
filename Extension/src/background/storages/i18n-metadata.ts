import { SettingOption } from '../../common/settings';
import { StringStorage } from '../utils/string-storage';
import { settingsStorage } from './settings';

export type CommonFilterI18nMetadata = {
    name: string,
    description: string,
};

export type TagI18nMetadata = {
    name: string,
    description: string,
};

export type GroupI18nMetadata = {
    name: string,
    description: string,
};

export type LocalesRecord<T> = Record<string, T>;

export type ItemsRecord<T> = Record<number, LocalesRecord<T>>;

export type FiltersI18n = ItemsRecord<CommonFilterI18nMetadata>;

export type GroupsI18n = ItemsRecord<GroupI18nMetadata>;

export type TagsI18n = ItemsRecord<TagI18nMetadata>;

export type I18nMetadata = {
    filters: FiltersI18n,
    groups: GroupsI18n,
    tags: TagsI18n,
};

export const i18nMetadataStorage = new StringStorage<SettingOption.I18N_METADATA, I18nMetadata>(
    SettingOption.I18N_METADATA,
    settingsStorage,
);
