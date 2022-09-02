import { ForwardAction, ForwardFrom, Forward } from '../../common/forward';

export const PRIVACY_URL = Forward.get({
    action: ForwardAction.PRIVACY,
    from: ForwardFrom.OPTIONS,
});

export const ACKNOWLEDGMENTS_URL = Forward.get({
    action: ForwardAction.ACKNOWLEDGMENTS,
    from: ForwardFrom.OPTIONS,
});

export const GITHUB_URL = Forward.get({
    action: ForwardAction.GITHUB,
    from: ForwardFrom.OPTIONS,
});

export const WEBSITE_URL = Forward.get({
    action: ForwardAction.WEBSITE,
    from: ForwardFrom.OPTIONS_FOOTER,
});

export const DISCUSS_URL = Forward.get({
    action: ForwardAction.DISCUSS,
    from: ForwardFrom.OPTIONS,
});

export const COMPARE_URL = Forward.get({
    action: ForwardAction.COMPARE,
    from: ForwardFrom.OPTIONS,
});

export const CHANGELOG_URL = Forward.get({
    action: ForwardAction.CHANGELOG,
    from: ForwardFrom.OPTIONS,
});

export const GLOBAL_PRIVACY_CONTROL_URL = Forward.get({
    action: ForwardAction.GLOBAL_PRIVACY_CONTROL,
    from: ForwardFrom.OPTIONS,
});

export const DO_NOT_TRACK_URL = Forward.get({
    action: ForwardAction.DO_NOT_TRACK,
    from: ForwardFrom.OPTIONS,
});

export const HOW_TO_CREATE_RULES_URL = Forward.get({
    action: ForwardAction.HOW_TO_CREATE_RULES,
    from: ForwardFrom.OPTIONS,
});

export const ACCEPTABLE_ADS_LEARN_MORE_URL = Forward.get({
    action: ForwardAction.SELF_PROMOTION,
    from: ForwardFrom.OPTIONS,
});

export const SAFEBROWSING_LEARN_MORE_URL = Forward.get({
    action: ForwardAction.PROTECTION_WORKS,
    from: ForwardFrom.OPTIONS,
});

export const COLLECT_HITS_LEARN_MORE_URL = Forward.get({
    action: ForwardAction.COLLECT_HITS_LEARN_MORE,
    from: ForwardFrom.OPTIONS,
});
