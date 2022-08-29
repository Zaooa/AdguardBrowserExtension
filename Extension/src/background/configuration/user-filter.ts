import zod from 'zod';

// User filter configuration

export const enum UserFilterOptions {
    RULES = 'rules',
    DISABLED_RULES = 'disabled-rules',
    ENABLED = 'enabled',
}

export const userFilterValidator = zod.object({
    [UserFilterOptions.RULES]: zod.string(),
    [UserFilterOptions.DISABLED_RULES]: zod.string(),
    [UserFilterOptions.ENABLED]: zod.boolean().optional(),
});

export type UserFilterConfig = zod.infer<typeof userFilterValidator>;
