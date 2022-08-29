import zod from 'zod';

import { generalSettingsConfigValidator } from './general-settings';
import { extensionSpecificSettingsConfigValidator } from './extension-specific-settings';
import { filtersConfigValidator } from './filters';
import { stealthConfigValidator } from './stealth';

// Root configuration

export const PROTOCOL_VERSION = '1.0';

export const enum Options {
    PROTOCOL_VERSION = 'protocol-version',
    GENERAL_SETTINGS = 'general-settings',
    EXTENSION_SPECIFIC_SETTINGS = 'extension-specific-settings',
    FILTERS = 'filters',
    STEALTH = 'stealth',
}

export const configValidator = zod.object({
    [Options.PROTOCOL_VERSION]: zod.literal(PROTOCOL_VERSION),
    [Options.GENERAL_SETTINGS]: generalSettingsConfigValidator,
    [Options.EXTENSION_SPECIFIC_SETTINGS]: extensionSpecificSettingsConfigValidator,
    [Options.FILTERS]: filtersConfigValidator,
    [Options.STEALTH]: stealthConfigValidator.optional(),
});

export type Config = zod.infer<typeof configValidator>;
