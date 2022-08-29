import zod from 'zod';

// Extension specific settings configuration

export const enum ExtensionSpecificSettingsOptions {
    USE_OPTIMIZED_FILTERS = 'use-optimized-filters',
    COLLECT_HITS_COUNT = 'collect-hits-count',
    SHOW_CONTEXT_MENU = 'show-context-menu',
    SHOW_INFO_ABOUT_ADGUARD = 'show-info-about-adguard',
    SHOW_APP_UPDATED_INFO = 'show-app-updated-info',
    HIDE_RATE_ADGUARD = 'hide-rate-adguard',
    USER_RULES_EDITOR_WRAP = 'user-rules-editor-wrap',
}

export const extensionSpecificSettingsConfigValidator = zod.object({
    [ExtensionSpecificSettingsOptions.USE_OPTIMIZED_FILTERS]: zod.boolean(),
    [ExtensionSpecificSettingsOptions.COLLECT_HITS_COUNT]: zod.boolean(),
    [ExtensionSpecificSettingsOptions.SHOW_CONTEXT_MENU]: zod.boolean(),
    [ExtensionSpecificSettingsOptions.SHOW_INFO_ABOUT_ADGUARD]: zod.boolean(),
    [ExtensionSpecificSettingsOptions.SHOW_APP_UPDATED_INFO]: zod.boolean(),
    [ExtensionSpecificSettingsOptions.HIDE_RATE_ADGUARD]: zod.boolean(),
    [ExtensionSpecificSettingsOptions.USER_RULES_EDITOR_WRAP]: zod.boolean(),
});

export type ExtensionSpecificSettingsConfig = zod.infer<typeof extensionSpecificSettingsConfigValidator>;
