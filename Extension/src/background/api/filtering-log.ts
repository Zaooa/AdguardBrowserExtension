/**
 * This file is part of Adguard Browser Extension (https://github.com/AdguardTeam/AdguardBrowserExtension).
 *
 * Adguard Browser Extension is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Adguard Browser Extension is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Adguard Browser Extension. If not, see <http://www.gnu.org/licenses/>.
 */
import { Tabs } from 'webextension-polyfill';
import {
    CosmeticRule,
    CosmeticRuleType,
    NetworkRule,
    NetworkRuleOption,
} from '@adguard/tsurlfilter';
import {
    BACKGROUND_TAB_ID,
    ContentType,
    CookieEvent,
    isExtensionUrl,
} from '@adguard/tswebextension';
import { AntiBannerFiltersId } from '../../common/constants';

import { listeners } from '../notifier';
import { TabsApi } from './extension/tabs';

export type FilteringEventRuleData = {
     filterId: number,
     ruleText: string,
     isImportant?: boolean,
     documentLevelRule?: boolean,
     isStealthModeRule?: boolean,
     allowlistRule?: boolean,
     cspRule?: boolean,
     modifierValue?: string,
     cookieRule?: boolean,
     contentRule?: boolean,
     cssRule?: boolean,
     scriptRule?: boolean,
 };

export type FilteringLogEvent = {
     eventId: string,
     requestUrl?: string,
     requestDomain?: string,
     frameUrl?: string,
     frameDomain?: string,
     requestType?: ContentType,
     timestamp?: number,
     requestThirdParty?: boolean,
     method?: string,
     statusCode?: number,
     requestRule?: FilteringEventRuleData,
     removeParam?: boolean,
     removeHeader?: boolean,
     headerName?: string,
     element?: string,
     cookieName?: string,
     cookieValue?: string,
     isModifyingCookieRule?: boolean,
 };

export type FilteringLogTabInfo = {
     tabId: number,
     title: string,
     isExtensionTab: boolean,
     filteringEvents: FilteringLogEvent[],
 };

export class FilteringLogApi {
     private static REQUESTS_SIZE_PER_TAB = 1000;

     private preserveLogEnabled = false;

     private openedFilteringLogsPages = 0;

     private tabsInfoMap: Record<number, FilteringLogTabInfo> = {};

     /**
      * Checks if filtering log page is open
      */
     public isOpen() {
         return this.openedFilteringLogsPages > 0;
     }

     /**
      * Returns info if preserve log is enabled
      */
     public isPreserveLogEnabled() {
         return this.preserveLogEnabled;
     }

     /**
      * Allows to toggle preserve log state
      */
     public setPreserveLogState(enabled: boolean) {
         this.preserveLogEnabled = enabled;
     }

     /**
      * We collect filtering events if opened at least one page of log
      */
     public onOpenFilteringLogPage() {
         this.openedFilteringLogsPages += 1;
     }

     /**
      * Cleanup when last page of log closes
      */
     public onCloseFilteringLogPage() {
         this.openedFilteringLogsPages = Math.max(this.openedFilteringLogsPages - 1, 0);
         if (this.openedFilteringLogsPages === 0) {
             // Clear events
             Object.keys(this.tabsInfoMap).forEach((tabId) => {
                 const tabInfo = this.tabsInfoMap[tabId];
                 tabInfo.filteringEvents = [];
             });
         }
     }

     /**
      * Create tab info
      */
     public createTabInfo(tab: Tabs.Tab, isSyntheticTab = false) {
         const { id, title, url } = tab;

         // Background tab can't be added
         // Synthetic tabs are used to send initial requests from new tab in chrome
         if (id === BACKGROUND_TAB_ID || isSyntheticTab) {
             return;
         }

         const tabInfo: FilteringLogTabInfo = {
             tabId: id,
             title,
             isExtensionTab: isExtensionUrl(url),
             filteringEvents: [],
         };

         this.tabsInfoMap[id] = tabInfo;

         listeners.notifyListeners(listeners.TAB_ADDED, tabInfo);
     }

     /**
     * Update tab title and url
     */
     public updateTabInfo(tab: Tabs.Tab) {
         const { id, title, url } = tab;

         // Background tab can't be updated
         if (id === BACKGROUND_TAB_ID) {
             return;
         }

         const tabInfo = this.getFilteringInfoByTabId(id);

         if (!tabInfo) {
             this.createTabInfo(tab);
             return;
         }

         tabInfo.title = title;
         tabInfo.isExtensionTab = isExtensionUrl(url);

         // this.tabsInfoMap[id] = tabInfo;

         listeners.notifyListeners(listeners.TAB_UPDATE, tabInfo);
     }

     /**
      * Removes tab info
      */
     public removeTabInfo(id: number) {
         // Background tab can't be removed
         if (id === BACKGROUND_TAB_ID) {
             return;
         }

         const tabInfo = this.tabsInfoMap[id];

         if (tabInfo) {
             listeners.notifyListeners(listeners.TAB_CLOSE, tabInfo);
         }
         delete this.tabsInfoMap[id];
     }

     /**
      * Get filtering info for tab
      */
     public getFilteringInfoByTabId(tabId: number): FilteringLogTabInfo {
         return this.tabsInfoMap[tabId];
     }

     /**
      * Synchronize currently opened tabs with out state
      */
     public async synchronizeOpenTabs() {
         const tabs = await TabsApi.getAll();

         // As Object.keys() returns strings we convert them to integers,
         // because tabId is integer in extension API
         const tabIdsToRemove = Object.keys(this.tabsInfoMap).map(id => Number(id));

         for (let i = 0; i < tabs.length; i += 1) {
             const openTab = tabs[i];
             const tabInfo = this.tabsInfoMap[openTab.id];

             if (!tabInfo) {
                 this.createTabInfo(openTab);
             } else {
                 // update tab
                 this.updateTabInfo(openTab);
             }
             const index = tabIdsToRemove.indexOf(openTab.id);
             if (index >= 0) {
                 tabIdsToRemove.splice(index, 1);
             }
         }
         for (let j = 0; j < tabIdsToRemove.length; j += 1) {
             this.removeTabInfo(tabIdsToRemove[j]);
         }

         const syncTabs = [];

         Object.keys(this.tabsInfoMap).forEach((tabId) => {
             syncTabs.push(this.tabsInfoMap[tabId]);
         });

         return syncTabs;
     }

     /**
      * Remove log requests for tab
      */
     public clearEventsByTabId(tabId: number, ignorePreserveLog = false) {
         const tabInfo = this.tabsInfoMap[tabId];

         const preserveLog = ignorePreserveLog ? false : this.preserveLogEnabled;

         if (tabInfo && !preserveLog) {
             tabInfo.filteringEvents = [];
             listeners.notifyListeners(listeners.TAB_RESET, tabInfo);
         }
     }

     public addEventData(tabId: number, data: FilteringLogEvent) {
         const tabInfo = this.getFilteringInfoByTabId(tabId);
         if (!tabInfo || !this.isOpen) {
             return;
         }

         tabInfo.filteringEvents.push(data);

         if (tabInfo.filteringEvents.length > FilteringLogApi.REQUESTS_SIZE_PER_TAB) {
             // don't remove first item, cause it's request to main frame
             tabInfo.filteringEvents.splice(1, 1);
         }

         listeners.notifyListeners(listeners.LOG_EVENT_ADDED, tabInfo, data);
     }

     public updateEventData(tabId: number, eventId: string, data: unknown) {
         const tabInfo = this.getFilteringInfoByTabId(tabId);
         if (!tabInfo || !this.isOpen) {
             return;
         }

         const { filteringEvents } = tabInfo;

         let event = filteringEvents.find(e => e.eventId === eventId);

         if (event) {
             event = Object.assign(event, data);

             listeners.notifyListeners(listeners.LOG_EVENT_ADDED, tabInfo, event);
         }
     }

     public isExistingCookieEvent = ({ data }: CookieEvent) => {
         const {
             tabId,
             cookieName,
             cookieValue,
             frameDomain,
         } = data;

         const tabInfo = this.getFilteringInfoByTabId(tabId);
         const filteringEvents = tabInfo?.filteringEvents;

         if (!filteringEvents) {
             return false;
         }

         return filteringEvents.some(event => {
             return event.frameDomain === frameDomain
             && event.cookieName === cookieName
             && event.cookieValue === cookieValue;
         });
     };

     public static createEventRuleData(rule: NetworkRule | CosmeticRule): FilteringEventRuleData {
         const data = Object.create(null);

         const filterId = rule.getFilterListId();
         const ruleText = rule.getText();

         data.filterId = filterId;
         data.ruleText = ruleText;

         if (rule instanceof NetworkRule) {
             if (rule.isOptionEnabled(NetworkRuleOption.Important)) {
                 data.isImportant = true;
             }

             if (rule.isDocumentLevelAllowlistRule()) {
                 data.documentLevelRule = true;
             }

             if (rule.getFilterListId() === AntiBannerFiltersId.STEALTH_MODE_FILTER_ID) {
                 data.isStealthModeRule = true;
             }

             data.allowlistRule = rule.isAllowlist();
             data.cspRule = rule.isOptionEnabled(NetworkRuleOption.Csp);
             data.modifierValue = rule.getAdvancedModifierValue();
             data.cookieRule = rule.isOptionEnabled(NetworkRuleOption.Cookie);
         } else if (rule instanceof CosmeticRule) {
             const ruleType = rule.getType();

             if (ruleType === CosmeticRuleType.Html) {
                 data.contentRule = true;
             } else if (ruleType === CosmeticRuleType.ElementHiding
                 || ruleType === CosmeticRuleType.Css) {
                 data.cssRule = true;
             } else if (ruleType === CosmeticRuleType.Js) {
                 data.scriptRule = true;
             }
         }

         /*
         if (filterId === AntiBannerFiltersId.USER_FILTER_ID) {
             const originalRule = userrules.getSourceRule(sourceRule.getText());
             if (originalRule) {
                 dto.ruleText = originalRule;
                 dto.appliedRuleText = rule.getText();
             }
         }
         */

         return data;
     }
}

export const filteringLogApi = new FilteringLogApi();
