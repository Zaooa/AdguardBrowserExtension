import browser from 'webextension-polyfill';
import {
    TabContext,
    tabsApi,
    defaultFilteringLog,
    FilteringEventType,
    SendRequestEvent,
    ReceiveResponseEvent,
    PageReloadEvent,
    RemoveParamEvent,
    RemoveHeaderEvent,
    // TODO: rename
    ApplyCosmenticRuleEvent,
    ApplyBasicRuleEvent,
    ApplyCspRuleEvent,
    CookieEvent,
    JsInjectEvent,
    ReplaceRuleApplyEvent,
    StealthActionEvent,
} from '@adguard/tswebextension';

import { messageHandler } from '../message-handler';
import { MessageType } from '../../common/messages';
import { UserAgent } from '../../common/user-agent';

import {
    FiltersApi,
    FilteringLogApi,
    filteringLogApi,
    SettingsApi,
} from '../api';

export class FilteringLogService {
    static init() {
        messageHandler.addListener(MessageType.GET_FILTERING_LOG_DATA, FilteringLogService.onGetFilteringLogData);
        messageHandler.addListener(MessageType.SYNCHRONIZE_OPEN_TABS, FilteringLogService.onSyncOpenTabs);
        messageHandler.addListener(
            MessageType.GET_FILTERING_INFO_BY_TAB_ID,
            FilteringLogService.onGetFilteringLogInfoById,
        );
        messageHandler.addListener(MessageType.ON_OPEN_FILTERING_LOG_PAGE, filteringLogApi.onOpenFilteringLogPage);
        messageHandler.addListener(MessageType.ON_CLOSE_FILTERING_LOG_PAGE, filteringLogApi.onCloseFilteringLogPage);
        messageHandler.addListener(MessageType.CLEAR_EVENTS_BY_TAB_ID, FilteringLogService.onClearEventsByTabId);
        messageHandler.addListener(MessageType.REFRESH_PAGE, FilteringLogService.onRefreshPage);
        messageHandler.addListener(MessageType.SET_PRESERVE_LOG_STATE, FilteringLogService.onSetPreserveLogState);

        tabsApi.onCreate.subscribe(FilteringLogService.onTabCreate);
        tabsApi.onUpdate.subscribe(FilteringLogService.onTabUpdate);
        tabsApi.onDelete.subscribe(FilteringLogService.onTabRemove);

        defaultFilteringLog.addEventListener(FilteringEventType.SEND_REQUEST, FilteringLogService.onSendRequest);
        defaultFilteringLog.addEventListener(FilteringEventType.PAGE_RELOAD, FilteringLogService.onPageReload);
        defaultFilteringLog.addEventListener(
            FilteringEventType.RECEIVE_RESPONSE,
            FilteringLogService.onReceiveResponse,
        );
        defaultFilteringLog.addEventListener(
            FilteringEventType.APPLY_BASIC_RULE,
            FilteringLogService.onApplyBasicRule,
        );

        defaultFilteringLog.addEventListener(
            FilteringEventType.APPLY_CSP_RULE,
            FilteringLogService.onApplyCspRule,
        );

        defaultFilteringLog.addEventListener(
            FilteringEventType.APPLY_COSMETIC_RULE,
            FilteringLogService.onApplyCosmeticRule,
        );
        defaultFilteringLog.addEventListener(FilteringEventType.REMOVE_PARAM, FilteringLogService.onRemoveParam);
        defaultFilteringLog.addEventListener(FilteringEventType.REMOVE_HEADER, FilteringLogService.onRemoveheader);

        defaultFilteringLog.addEventListener(FilteringEventType.COOKIE, FilteringLogService.onCookie);

        defaultFilteringLog.addEventListener(FilteringEventType.JS_INJECT, FilteringLogService.onScriptInjection);

        defaultFilteringLog.addEventListener(FilteringEventType.STEALTH_ACTION, FilteringLogService.onStealthAction);

        if (UserAgent.isFirefox) {
            defaultFilteringLog.addEventListener(
                FilteringEventType.REPLACE_RULE_APPLY,
                FilteringLogService.onReplaceRuleApply,
            );
        }
    }

    static onSendRequest({ data }: SendRequestEvent) {
        const { tabId, ...eventData } = data;

        filteringLogApi.addEventData(tabId, eventData);
    }

    static onPageReload(event: PageReloadEvent) {
        const { tabId } = event.data;
        filteringLogApi.clearEventsByTabId(tabId);
    }

    static onApplyBasicRule({ data }: ApplyBasicRuleEvent) {
        const {
            tabId,
            eventId,
            rule,
        } = data;

        filteringLogApi.updateEventData(tabId, eventId, {
            requestRule: FilteringLogApi.createEventRuleData(rule),
        });
    }

    static onApplyCosmeticRule({ data }: ApplyCosmenticRuleEvent) {
        const {
            tabId,
            rule,
            ...eventData
        } = data;

        filteringLogApi.addEventData(tabId, {
            ...eventData,
            requestRule: FilteringLogApi.createEventRuleData(rule),
        });
    }

    static onApplyCspRule({ data }: ApplyCspRuleEvent) {
        const {
            tabId,
            rule,
            ...eventData
        } = data;

        filteringLogApi.addEventData(tabId, {
            ...eventData,
            requestRule: FilteringLogApi.createEventRuleData(rule),
        });
    }

    static onRemoveParam({ data }: RemoveParamEvent) {
        const { tabId } = data;

        filteringLogApi.addEventData(tabId, data);
    }

    static onRemoveheader({ data }: RemoveHeaderEvent) {
        const { tabId, rule, ...eventData } = data;

        filteringLogApi.addEventData(tabId, {
            ...eventData,
            requestRule: FilteringLogApi.createEventRuleData(rule),
        });
    }

    static onReceiveResponse({ data }: ReceiveResponseEvent) {
        const { eventId, tabId, statusCode } = data;

        filteringLogApi.updateEventData(tabId, eventId, { statusCode });
    }

    static onCookie(event: CookieEvent) {
        if (filteringLogApi.isExistingCookieEvent(event)) {
            return;
        }

        const { tabId, rule, ...eventData } = event.data;

        filteringLogApi.addEventData(tabId, {
            ...eventData,
            requestRule: FilteringLogApi.createEventRuleData(rule),
        });
    }

    static onScriptInjection(event: JsInjectEvent) {
        const { tabId, rule, ...eventData } = event.data;

        filteringLogApi.addEventData(tabId, {
            ...eventData,
            requestRule: FilteringLogApi.createEventRuleData(rule),
        });
    }

    static onReplaceRuleApply({ data }: ReplaceRuleApplyEvent) {
        const { tabId, rules, eventId } = data;

        filteringLogApi.updateEventData(tabId, eventId, {
            requestRule: { replaceRule: true },
            replaceRules: rules.map(rule => FilteringLogApi.createEventRuleData(rule)),
        });
    }

    static onStealthAction({ data }: StealthActionEvent) {
        const { tabId, eventId, stealthActions } = data;

        filteringLogApi.updateEventData(tabId, eventId, { stealthActions });
    }

    static onTabCreate(tabContext: TabContext) {
        const { info, isSyntheticTab } = tabContext;

        filteringLogApi.createTabInfo(info, isSyntheticTab);
    }

    static onTabUpdate(tabContext: TabContext) {
        const { info } = tabContext;

        filteringLogApi.updateTabInfo(info);
    }

    static onTabRemove(tabContext: TabContext) {
        const { info: { id } } = tabContext;

        filteringLogApi.removeTabInfo(id);
    }

    static onClearEventsByTabId({ data }) {
        filteringLogApi.clearEventsByTabId(data.tabId, data.ignorePreserveLog);
    }

    static onSetPreserveLogState({ data }) {
        filteringLogApi.setPreserveLogState(data.state);
    }

    static async onRefreshPage({ data }) {
        await browser.tabs.reload(data.tabId);
    }

    static onGetFilteringLogInfoById({ data }) {
        const { tabId } = data;

        return filteringLogApi.getFilteringInfoByTabId(tabId);
    }

    static async onSyncOpenTabs() {
        return filteringLogApi.synchronizeOpenTabs();
    }

    static onGetFilteringLogData() {
        return {
            filtersMetadata: FiltersApi.getFiltersMetadata(),
            settings: SettingsApi.getData(),
            preserveLogEnabled: filteringLogApi.isPreserveLogEnabled(),
        };
    }
}
