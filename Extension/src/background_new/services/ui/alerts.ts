import browser from 'webextension-polyfill';

import { translator } from '../../../common/translators/translator';
import { TabsApi } from '../../extension-api';
import { FiltersApi } from '../filters/api';
import { UiApi } from './api';

export class Alerts {
    static stylesUrl = browser.runtime.getURL('/assets/css/alert-popup.css');

    private styles: string;

    public async init() {
        const response = await fetch(Alerts.stylesUrl);
        this.styles = await response.text();
    }

    public async showAlertMessage(title: string, text: string[]): Promise<void> {
        const tab = await TabsApi.getActive();

        if (tab?.id) {
            browser.tabs.sendMessage(tab.id, {
                type: 'show-alert-popup',
                isAdguardTab: UiApi.isExtensionTab(tab),
                title,
                text,
                // TODO: fix
                alertStyles: this.styles,
            });
        }
    }

    public showFiltersEnabledAlertMessage(enabledFilters: any[]) {
        const { title, text } = Alerts.getFiltersEnabledResultMessage(enabledFilters);

        this.showAlertMessage(title, text);
    }

    private static getFiltersEnabledResultMessage(enabledFilters: number[]) {
        const title = translator.getMessage('alert_popup_filter_enabled_title');

        const text = enabledFilters
            // TODO: optimization
            .map(filterId => FiltersApi.getFilterMetadata(filterId))
            .sort((a, b) => a.displayNumber - b.displayNumber)
            .map(filter => translator.getMessage('alert_popup_filter_enabled_desc', { filter_name: filter.name }));

        return {
            title,
            text,
        };
    }
}

export const alerts = new Alerts();
