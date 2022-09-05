import browser from 'webextension-polyfill';
import { SettingOption } from '../../../common/settings';
import { UserAgent } from '../../../common/user-agent';
import { UiService } from '../../services';

import {
    notificationStorage,
    Notification,
    NotificationText,
    settingsStorage,
} from '../../storages';
import { TabsApi } from '../extension';

export class NotificationApi {
    private static checkTimeoutMs = 10 * 60 * 1000; // 10 minutes

    private static minPeriodMs = 30 * 1000; // 30 minutes

    private static delayMs = 30 * 1000; // clear notification in 30 seconds

    private currentNotification: Notification | null;

    private notificationCheckTime: number;

    private timeoutId: number;

    private isInit = false;

    /**
     * Scans notifications list and prepares them to be used (or removes expired)
     */
    public init() {
        notificationStorage.forEach((notification, notificationKey, map) => {
            notification.text = NotificationApi.getNotificationText(notification);

            const to = new Date(notification.to).getTime();
            const expired = new Date().getTime() > to;

            if (!notification.text || expired) {
                // Remove expired and invalid
                map.delete(notificationKey);
            }
        });

        this.isInit = true;
    }

    /**
     * Marks current notification as viewed
     * @param withDelay if true, do this after a 30 sec delay
     */
    public async setNotificationViewed(withDelay: boolean) {
        if (withDelay) {
            clearTimeout(this.timeoutId);

            this.timeoutId = window.setTimeout(() => {
                this.setNotificationViewed(false);
            }, NotificationApi.delayMs);
            return;
        }

        if (this.currentNotification) {
            const viewedNotifications = settingsStorage.get(SettingOption.VIEWED_NOTIFICATIONS) || [];
            const { id } = this.currentNotification;

            if (!viewedNotifications.includes(id)) {
                viewedNotifications.push(id);
                settingsStorage.set(SettingOption.VIEWED_NOTIFICATIONS, viewedNotifications);
                const tab = await TabsApi.getActive();
                if (tab?.id) {
                    await UiService.updateTabIcon(tab.id);
                }
                this.currentNotification = null;
            }
        }
    }

    /**
     * Finds out notification for current time and checks if notification wasn't shown yet
     */
    public getCurrentNotification(): Notification | null {
        // Do not display notification on Firefox
        if (UserAgent.isFirefox) {
            return null;
        }

        // Do not display notification before initialization
        if (!this.isInit) {
            return null;
        }

        const currentTime = Date.now();
        const timeSinceLastNotification = currentTime - NotificationApi.getLastNotificationTime();

        if (timeSinceLastNotification < NotificationApi.minPeriodMs) {
        // Just a check to not show the notification too often
            return null;
        }

        // Check not often than once in 10 minutes
        const timeSinceLastCheck = currentTime - this.notificationCheckTime;
        if (this.notificationCheckTime > 0 && timeSinceLastCheck <= NotificationApi.checkTimeoutMs) {
            return this.currentNotification;
        }

        // Update the last notification check time
        this.notificationCheckTime = currentTime;

        const viewedNotifications = settingsStorage.get(SettingOption.VIEWED_NOTIFICATIONS) || [];

        const notificationsValues = Array.from(notificationStorage.values());

        for (let i = 0; i < notificationsValues.length; i += 1) {
            const notification = notificationsValues[i];

            const from = new Date(notification.from).getTime();
            const to = new Date(notification.to).getTime();
            if (from < currentTime
            && to > currentTime
            && !viewedNotifications.includes(notification.id)
            ) {
                this.currentNotification = notification;
                return this.currentNotification;
            }
        }

        this.currentNotification = null;

        return this.currentNotification;
    }

    /**
     * Scans notification locales and returns the one matching navigator.language
     * @param {*} notification notification object
     * @returns {string} matching text or null
     */
    private static getNotificationText(notification: Notification): NotificationText | null {
        const language = NotificationApi.normalizeLanguage(browser.i18n.getUILanguage());

        if (!language) {
            return null;
        }

        const languageCode = language.split('_')[0];
        if (!languageCode) {
            return null;
        }

        return notification.locales[language] || notification.locales[languageCode];
    }

    private static normalizeLanguage(locale: string): string | null {
        if (!locale) {
            return null;
        }

        return locale.toLowerCase().replace('-', '_');
    }

    /**
     * Gets the last time a notification was shown.
     * If it was not shown yet, initialized with the current time.
     */
    private static getLastNotificationTime() {
        let lastTime = settingsStorage.get(SettingOption.LAST_NOTIFICATION_TIME) || 0;

        if (lastTime === 0) {
            lastTime = Date.now();
            settingsStorage.set(SettingOption.LAST_NOTIFICATION_TIME, lastTime);
        }

        return lastTime;
    }
}

export const notificationApi = new NotificationApi();
