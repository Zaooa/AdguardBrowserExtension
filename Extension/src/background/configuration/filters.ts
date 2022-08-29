import zod from 'zod';

import { customFiltersConfigValidator } from './custom-filters';
import { userFilterValidator } from './user-filter';
import { allowlistValidator } from './allowlist';

// Adguard filters configuration

export const enum FiltersOptions {
    ENABLED_GROUPS = 'enabled-groups',
    ENABLED_FILTERS = 'enabled-filters',
    CUSTOM_FILTERS = 'custom-filters',
    USER_FILTER = 'user-filter',
    ALLOWLIST = 'whitelist',
}

export const filtersConfigValidator = zod.object({
    [FiltersOptions.ENABLED_GROUPS]: zod.array(zod.number().int()),
    [FiltersOptions.ENABLED_FILTERS]: zod.array(zod.number().int()),
    [FiltersOptions.CUSTOM_FILTERS]: customFiltersConfigValidator,
    [FiltersOptions.USER_FILTER]: userFilterValidator,
    [FiltersOptions.ALLOWLIST]: allowlistValidator,
});

export type FiltersConfig = zod.infer<typeof filtersConfigValidator>;
