import zod from 'zod';

// Allowlist configuration

export const enum AllowlistOptions {
    INVERTED = 'inverted',
    DOMAINS = 'domains',
    INVERTED_DOMAINS = 'inverted-domains',
    ENABLED = 'enabled',
}

export const allowlistValidator = zod.object({
    [AllowlistOptions.DOMAINS]: zod.array(zod.string()),
    [AllowlistOptions.INVERTED_DOMAINS]: zod.array(zod.string()),
    [AllowlistOptions.ENABLED]: zod.boolean().optional(),
    [AllowlistOptions.INVERTED]: zod.boolean().optional(),
});

export type AllowlistConfig = zod.infer<typeof allowlistValidator>;
