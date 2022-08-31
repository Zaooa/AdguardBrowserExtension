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

import browser from 'webextension-polyfill';

import { lazyGet } from './lazy';
import { TabsApi } from '../api';
import { UiService } from '../services';
import { settingsStorage } from '../storages';
import { UserAgent } from '../../common/user-agent';
import { SettingOption } from '../../common/settings';

export type NotificationLocale = {
    title: string,
    desc?: string,
    btn: string,
};

export type Notification = {
    id: string,
    locales: Record<string, NotificationLocale>
    url: string,
    text: string | NotificationLocale | null,
    from: string,
    to: string,
    type: string,
    bgColor?: string,
    textColor?: string,
    badgeBgColor?: string,
    badgeText?: string,
    icons?: Record<string, Record<string, string>>,
};

// TODO: Class instead function, move to api/ui

/**
 * Object that manages user settings.
 * @constructor
 */
export const notifications = (function () {
    const BACK_TO_SCHOOL_22_ID = 'backToSchool22';

    const backToSchool22Notification: Notification = {
        id: BACK_TO_SCHOOL_22_ID,
        locales: {
            en: {
                title: 'Back',
                desc: 'to school',
                btn: 'Get 40% off',
            },
            ru: {
                title: 'Снова в',
                desc: 'школу',
                btn: '-40% на всё',
            },
            es: {
                title: 'Vuelta al',
                desc: 'cole',
                btn: 'Obtén un 40% off',
            },
            de: {
                title: 'Zurück zur',
                desc: 'Schule',
                btn: '40% Rabatt',
            },
            fr: {
                title: 'La rentrée',
                desc: 'scolaire',
                btn: '40% de remise',
            },
            it: {
                title: 'Ritorno a',
                desc: 'scuola',
                btn: '40% di sconto',
            },
            ko: {
                title: '백 투 스쿨',
                desc: '세일',
                btn: '40% 할인',
            },
            zh_cn: {
                title: '开学啦',
                btn: '一律享受40%折扣',
            },
            zh_tw: {
                title: '開學啦',
                btn: '獲得40%的折扣',
            },
            uk: {
                title: 'Знову до',
                desc: 'школи',
                btn: 'Знижка 40%',
            },
            pt_pt: {
                title: 'De volta à',
                desc: 'escola',
                btn: 'Obter 40% de desconto',
            },
            pt_br: {
                title: 'De volta à',
                desc: 'escola',
                btn: 'Obtenha 40% de desconto',
            },
            ar: {
                title: 'العودة',
                desc: 'إلى المدرسة',
                btn: '%احصل على خصم 40',
            },
            be: {
                title: 'Назад у',
                desc: 'школу',
                btn: 'Атрымайце скідку 40%',
            },
            id: {
                title: 'Kembali ke',
                desc: 'sekolah',
                btn: 'Dapatkan diskon 40%',
            },
            pl: {
                title: 'Powrót do',
                desc: 'szkoły',
                btn: 'Zyskaj 40% zniżki',
            },
            tr: {
                title: 'Okula dönüş',
                btn: '40 indirim kazanın',
            },
            vi: {
                title: 'Trở lại',
                desc: 'trường học',
                btn: 'Được GIẢM GIÁ 40%',
            },
        },
        text: '',
        url: 'https://link.adtidy.org/forward.html?action=back_to_school_22&app=browser_extension',
        from: '30 August 2022 12:00:00',
        to: '4 September 2022 23:59:00',
        type: 'animated',
        get icons() {
            return lazyGet(backToSchool22Notification, 'icons', () => ({
                ICON_GREEN: {
                    '19': browser.runtime.getURL('assets/icons/promo-on-19.png'),
                    '38': browser.runtime.getURL('assets/icons/promo-on-38.png'),
                },
                ICON_GRAY: {
                    '19': browser.runtime.getURL('assets/icons/promo-off-19.png'),
                    '38': browser.runtime.getURL('assets/icons/promo-off-38.png'),
                },
            }));
        },
    };

    const notifications: Record<string, Notification> = {
        backToSchool22: backToSchool22Notification,
    };

    /**
     * Gets the last time a notification was shown.
     * If it was not shown yet, initialized with the current time.
     */
    const getLastNotificationTime = function () {
        let lastTime = settingsStorage.get(SettingOption.LAST_NOTIFICATION_TIME) || 0;
        if (lastTime === 0) {
            lastTime = new Date().getTime();
            settingsStorage.set(SettingOption.LAST_NOTIFICATION_TIME, lastTime);
        }
        return lastTime;
    };

    const normalizeLanguage = (locale: string): string | null => {
        if (!locale) {
            return null;
        }

        return locale.toLowerCase().replace('-', '_');
    };

    /**
     * Scans notification locales and returns the one matching navigator.language
     * @param {*} notification notification object
     * @returns {string} matching text or null
     */
    const getNotificationText = (notification: Notification): NotificationLocale | null => {
        const language = normalizeLanguage(browser.i18n.getUILanguage());

        if (!language) {
            return null;
        }

        const languageCode = language.split('_')[0];
        if (!languageCode) {
            return null;
        }

        return notification.locales[language] || notification.locales[languageCode];
    };

    /**
     * Scans notifications list and prepares them to be used (or removes expired)
     */
    const initNotifications = function () {
        const notificationsKeys = Object.keys(notifications);

        for (let i = 0; i < notificationsKeys.length; i += 1) {
            const notificationKey = notificationsKeys[i];
            const notification = notifications[notificationKey];

            notification.text = getNotificationText(notification);

            const to = new Date(notification.to).getTime();
            const expired = new Date().getTime() > to;

            if (!notification.text || expired) {
                // Remove expired and invalid
                delete notifications[notificationKey];
            }
        }
    };

    // Prepare the notifications
    initNotifications();

    let currentNotification: Notification | null;
    let notificationCheckTime;
    const checkTimeoutMs = 10 * 60 * 1000; // 10 minutes
    const minPeriod = 30 * 60 * 1000; // 30 minutes
    const DELAY = 30 * 1000; // clear notification in 30 seconds
    let timeoutId;

    /**
     * Marks current notification as viewed
     * @param {boolean} withDelay if true, do this after a 30 sec delay
     */
    const setNotificationViewed = async function (withDelay) {
        if (withDelay) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                setNotificationViewed(false);
            }, DELAY);
            return;
        }

        if (currentNotification) {
            const viewedNotifications = settingsStorage.get(SettingOption.VIEWED_NOTIFICATIONS) || [];
            const { id } = currentNotification;

            if (!viewedNotifications.includes(id)) {
                viewedNotifications.push(id);
                settingsStorage.set(SettingOption.VIEWED_NOTIFICATIONS, viewedNotifications);
                const tab = await TabsApi.getActive();
                if (tab?.id) {
                    await UiService.updateTabIcon(tab.id);
                }
                currentNotification = null;
            }
        }
    };

    /**
     * Finds out notification for current time and checks if notification wasn't shown yet
     */
    const getCurrentNotification = (): null | Notification => {
        // Do not display notification on Firefox
        if (UserAgent.isFirefox) {
            return null;
        }

        const currentTime = new Date().getTime();
        const timeSinceLastNotification = currentTime - getLastNotificationTime();
        if (timeSinceLastNotification < minPeriod) {
            // Just a check to not show the notification too often
            return null;
        }

        // Check not often than once in 10 minutes
        const timeSinceLastCheck = currentTime - notificationCheckTime;
        if (notificationCheckTime > 0 && timeSinceLastCheck <= checkTimeoutMs) {
            return currentNotification;
        }
        // Update the last notification check time
        notificationCheckTime = currentTime;

        const notificationsKeys = Object.keys(notifications);
        const viewedNotifications = settingsStorage.get(SettingOption.VIEWED_NOTIFICATIONS) as unknown[] || [];

        for (let i = 0; i < notificationsKeys.length; i += 1) {
            const notificationKey = notificationsKeys[i];
            const notification = notifications[notificationKey];
            const from = new Date(notification.from).getTime();
            const to = new Date(notification.to).getTime();
            if (from < currentTime
                && to > currentTime
                && !viewedNotifications.includes(notification.id)
            ) {
                currentNotification = notification;
                return currentNotification;
            }
        }

        currentNotification = null;
        return currentNotification;
    };

    return {
        getCurrentNotification,
        setNotificationViewed,
    };
})();
