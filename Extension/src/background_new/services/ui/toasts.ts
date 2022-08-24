import browser from 'webextension-polyfill';
import { log } from '../../../common/log';
import { browserUtils } from '../../../background/utils/browser-utils';

import { translator } from '../../../common/translators/translator';
import { TabsApi } from '../../extension-api';
import { UiApi } from './api';
import { CommonFilterMetadata } from '../filters/metadata';

export class Toasts {
    private static maxTries = 500; // 2500 sec

    private static triesTimeout = 5000; // 5 sec

    private static stylesUrl = browser.runtime.getURL('/assets/css/alert-popup.css');

    private styles: string;

    public async init() {
        const response = await fetch(Toasts.stylesUrl);
        this.styles = await response.text();
    }

    public async showAlertMessage(title: string, text: string | string[], triesCount = 1): Promise<void> {
        try {
            if (triesCount > Toasts.maxTries) {
                // Give up
                log.warn('Reached max tries on attempts to show alert popup');
                return;
            }

            const tab = await TabsApi.getActive();

            if (tab?.id) {
                await browser.tabs.sendMessage(tab.id, {
                    type: 'show-alert-popup',
                    isAdguardTab: UiApi.isExtensionTab(tab),
                    title,
                    text,
                    alertStyles: this.styles,
                });
            }
        } catch (e) {
            setTimeout(() => {
                this.showAlertMessage(title, text, triesCount + 1);
            }, Toasts.triesTimeout);
        }
    }

    public showFiltersEnabledAlertMessage(filters: CommonFilterMetadata[]) {
        const { title, text } = Toasts.getFiltersEnabledResultMessage(filters);

        this.showAlertMessage(title, text);
    }

    public showFiltersUpdatedAlertMessage(success: boolean, filters?: CommonFilterMetadata[]) {
        const { title, text } = Toasts.getFiltersUpdateResultMessage(success, filters);

        this.showAlertMessage(title, text);
    }

    /**
     * Shows application updated popup
     *
     */
    public async showApplicationUpdatedPopup(
        currentVersion: string,
        previousVersion: string,
        triesCount = 1,
    ) {
        /* TODO: notification
        const promoNotification = notifications.getCurrentNotification();
        if (!promoNotification
            && browserUtils.getMajorVersionNumber(
                currentVersion
            ) === browserUtils.getMajorVersionNumber(previousVersion)
            && browserUtils.getMinorVersionNumber(
                currentVersion
            ) === browserUtils.getMinorVersionNumber(previousVersion)
        ) {
            // In case of no promo available or versions equivalence
            return;
        }
        */

        const offer = translator.getMessage('options_popup_version_update_offer');
        const offerDesc = '';
        // eslint-disable-next-line max-len
        const offerButtonHref = 'https://link.adtidy.org/forward.html?action=learn_about_adguard&from=version_popup&app=browser_extension';
        const offerButtonText = translator.getMessage('options_popup_version_update_offer_button_text');

        /*
        if (promoNotification) {
            offer = promoNotification.text.title;
            offerDesc = promoNotification.text.desc;
            offerButtonText = promoNotification.text.btn;
            offerButtonHref = `${promoNotification.url}&from=version_popup`;
        }
        */

        const message = {
            type: 'show-version-updated-popup',
            title: translator.getMessage(
                'options_popup_version_update_title_text',
                { current_version: currentVersion },
            ),
            description: Toasts.getUpdateDescriptionMessage(currentVersion, previousVersion),
            // eslint-disable-next-line max-len
            changelogHref: 'https://link.adtidy.org/forward.html?action=github_version_popup&from=version_popup&app=browser_extension',
            changelogText: translator.getMessage('options_popup_version_update_changelog_text'),
            showPromoNotification: false, // !!promoNotification, TODO
            offer,
            offerDesc,
            offerButtonText,
            offerButtonHref,
            disableNotificationText: translator.getMessage('options_popup_version_update_disable_notification'),
            alertStyles: this.styles,
        };

        try {
            if (triesCount > Toasts.maxTries) {
                // Give up
                log.warn('Reached max tries on attempts to show application update popup');
                return;
            }

            const tab = await TabsApi.getActive();
            if (tab?.id) {
                await browser.tabs.sendMessage(tab.id, message);
            }
        } catch (e) {
            setTimeout(() => {
                this.showApplicationUpdatedPopup(currentVersion, previousVersion, triesCount + 1);
            }, Toasts.triesTimeout);
        }
    }

    private static getFiltersEnabledResultMessage(enabledFilters: CommonFilterMetadata[]) {
        const title = translator.getMessage('alert_popup_filter_enabled_title');

        const text = enabledFilters
            .sort((a, b) => a.displayNumber - b.displayNumber)
            .map(filter => translator.getMessage('alert_popup_filter_enabled_desc', { filter_name: filter.name }));

        return {
            title,
            text,
        };
    }

    private static getFiltersUpdateResultMessage(
        success: boolean,
        updatedFilters?: CommonFilterMetadata[],
    ) {
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

    /**
     * Depending on version numbers select proper message for description
     */
    private static getUpdateDescriptionMessage(currentVersion: string, previousVersion: string) {
        if ((
            browserUtils.getMajorVersionNumber(currentVersion) > browserUtils.getMajorVersionNumber(previousVersion)
        ) || (
            browserUtils.getMinorVersionNumber(currentVersion) > browserUtils.getMinorVersionNumber(previousVersion)
        )) {
            return translator.getMessage('options_popup_version_update_description_major');
        }

        return translator.getMessage('options_popup_version_update_description_minor');
    }
}

export const toasts = new Toasts();
