import zod from 'zod';

// Stealth configuration

export const enum StealthOptions {
    DISABLE_STEALTH_MODE = 'stealth_disable_stealth_mode',
    HIDE_REFERRER = 'stealth-hide-referrer',
    HIDE_SEARCH_QUERIES = 'stealth-hide-search-queries',
    SEND_DO_NOT_TRACK = 'stealth-send-do-not-track',
    BLOCK_WEBRTC = 'stealth-block-webrtc',
    REMOVE_X_CLIENT_DATA = 'stealth-remove-x-client',
    BLOCK_THIRD_PARTY_COOKIES = 'stealth-block-third-party-cookies',
    BLOCK_THIRD_PARTY_COOKIES_TIME = 'stealth-block-third-party-cookies-time',
    BLOCK_FIRST_PARTY_COOKIES = 'stealth-block-first-party-cookies',
    BLOCK_FIRST_PARTY_COOKIES_TIME = 'stealth-block-first-party-cookies-time',
    BLOCK_KNOWN_TRACKERS = 'block-known-trackers',
    STRIP_TRACKING_PARAMS = 'strip-tracking-parameters',
}

export const stealthConfigValidator = zod.object({
    [StealthOptions.DISABLE_STEALTH_MODE]: zod.boolean(),
    [StealthOptions.HIDE_REFERRER]: zod.boolean(),
    [StealthOptions.HIDE_SEARCH_QUERIES]: zod.boolean(),
    [StealthOptions.SEND_DO_NOT_TRACK]: zod.boolean(),
    [StealthOptions.BLOCK_WEBRTC]: zod.boolean(),
    [StealthOptions.REMOVE_X_CLIENT_DATA]: zod.boolean(),
    [StealthOptions.BLOCK_THIRD_PARTY_COOKIES]: zod.boolean(),
    [StealthOptions.BLOCK_THIRD_PARTY_COOKIES_TIME]: zod.number().int().optional(),
    [StealthOptions.BLOCK_FIRST_PARTY_COOKIES]: zod.boolean(),
    [StealthOptions.BLOCK_FIRST_PARTY_COOKIES_TIME]: zod.number().int().optional(),
    [StealthOptions.BLOCK_KNOWN_TRACKERS]: zod.boolean().optional(),
    [StealthOptions.STRIP_TRACKING_PARAMS]: zod.boolean(),
});

export type StealthConfig = zod.infer<typeof stealthConfigValidator>;
