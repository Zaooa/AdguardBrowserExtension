import zod from 'zod';

// General settings configuration

export const enum GeneralSettingsOptions {
    APP_LANGUAGE = 'app-language',
    ALLOW_ACCEPTABLE_ADS = 'allow-acceptable-ads',
    SHOW_BLOCKED_ADS_COUNT = 'show-blocked-ads-count',
    AUTODETECT_FILTERS = 'autodetect-filters',
    SAFEBROWSING_ENABLED = 'safebrowsing-enabled',
    FILTERS_UPDATE_PERIOD = 'filters-update-period',
    APPEARANCE_THEME = 'appearance-theme',
}

export const generalSettingsConfigValidator = zod.object({
    [GeneralSettingsOptions.APP_LANGUAGE]: zod.string().optional(),
    [GeneralSettingsOptions.ALLOW_ACCEPTABLE_ADS]: zod.boolean(),
    [GeneralSettingsOptions.SHOW_BLOCKED_ADS_COUNT]: zod.boolean(),
    [GeneralSettingsOptions.AUTODETECT_FILTERS]: zod.boolean(),
    [GeneralSettingsOptions.SAFEBROWSING_ENABLED]: zod.boolean(),
    [GeneralSettingsOptions.FILTERS_UPDATE_PERIOD]: zod.number().int(),
    [GeneralSettingsOptions.APPEARANCE_THEME]: zod.enum(['system', 'dark', 'light']).optional(),
});

export type GeneralSettingsConfig = zod.infer<typeof generalSettingsConfigValidator>;
