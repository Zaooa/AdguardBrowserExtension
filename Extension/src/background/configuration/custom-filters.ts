import zod from 'zod';

// Custom filters configuration

export const enum CustomFilterOption {
    CUSTOM_URL = 'customUrl',
    TITLE = 'title',
    TRUSTED = 'trusted',
    ENABLED = 'enabled',
}

export const customFiltersConfigValidator = zod.array(
    zod.object({
        [CustomFilterOption.CUSTOM_URL]: zod.string(),
        [CustomFilterOption.TITLE]: zod.string().optional(),
        [CustomFilterOption.TRUSTED]: zod.boolean().optional(),
        [CustomFilterOption.ENABLED]: zod.boolean().optional(),
    }),
);

export type CustomFiltersConfig = zod.infer<typeof customFiltersConfigValidator>;
