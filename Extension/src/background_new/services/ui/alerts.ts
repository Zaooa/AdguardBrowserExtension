import browser from 'webextension-polyfill';

import { translator } from '../../../common/translators/translator';
import { TabsApi } from '../../extension-api';
import { UiApi } from './api';

export class Alerts {
    static stylesUrl = browser.runtime.getURL('/assets/css/alert-popup.css');

    private styles: string;

    public async init() {
        const response = await fetch(Alerts.stylesUrl);
        this.styles = await response.text();
    }

    public async showAlertMessage(title: string, text: string | string[]): Promise<void> {
        const tab = await TabsApi.getActive();

        if (tab?.id) {
            browser.tabs.sendMessage(tab.id, {
                type: 'show-alert-popup',
                isAdguardTab: UiApi.isExtensionTab(tab),
                title,
                text,
                alertStyles: this.styles,
            });
        }
    }

    public showFiltersEnabledAlertMessage(filters: any[]) {
        const { title, text } = Alerts.getFiltersEnabledResultMessage(filters);

        this.showAlertMessage(title, text);
    }

    public showFiltersUpdatedAlertMessage(success: boolean, filters?: any[]) {
        const { title, text } = Alerts.getFiltersUpdateResultMessage(success, filters);

        this.showAlertMessage(title, text);
    }

    private static getFiltersEnabledResultMessage(enabledFilters: any[]) {
        const title = translator.getMessage('alert_popup_filter_enabled_title');

        const text = enabledFilters
            .sort((a, b) => a.displayNumber - b.displayNumber)
            .map(filter => translator.getMessage('alert_popup_filter_enabled_desc', { filter_name: filter.name }));

        return {
            title,
            text,
        };
    }

    private static getFiltersUpdateResultMessage(success: boolean, updatedFilters?: any[]) {
        if (!success || !updatedFilters) {
            return {
                title: translator.getMessage('options_popup_update_title_error'),
                text: translator.getMessage('options_popup_update_error'),
            };
        }

        const title = '';

        if (updatedFilters.length === 0) {
            return {
                title,
                text: translator.getMessage('options_popup_update_not_found'),
            };
        }

        let text = updatedFilters
            .sort((a, b) => {
                if (a.groupId === b.groupId) {
                    return a.displayNumber - b.displayNumber;
                }
                return Number(a.groupId === b.groupId);
            })
            .map(filter => `${filter.name}`)
            .join(', ');

        if (updatedFilters.length > 1) {
            text += ` ${translator.getMessage('options_popup_update_filters')}`;
        } else {
            text += ` ${translator.getMessage('options_popup_update_filter')}`;
        }

        return {
            title,
            text,
        };
    }
}

export const alerts = new Alerts();
