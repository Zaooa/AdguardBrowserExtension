import {
    isSameHour,
    isSameDay,
    isSameMonth,
    differenceInHours,
    differenceInDays,
    differenceInMonths,
} from 'date-fns';

import { SettingOption } from '../../common/settings';
import { StringStorage } from '../utils/string-storage';
import { settingsStorage } from './settings';

export type PageStatsDataItem = Record<string, number>;

export type PageStatsData = {
    hours: PageStatsDataItem[],
    days: PageStatsDataItem[],
    months: PageStatsDataItem[],
    updated: number;
};

export type PageStats = {
    totalBlocked?: number,
    data?: PageStatsData,
};

export class PageStatsStorage extends StringStorage<
    SettingOption.PAGE_STATISTIC,
    PageStats
> {
    public static TOTAL_GROUP_ID = 'total';

    public static MAX_HOURS_HISTORY = 24;

    public static MAX_DAYS_HISTORY = 30;

    public static MAX_MONTHS_HISTORY = 3;

    public getTotalBlocked(): number | undefined {
        return this.getData().totalBlocked;
    }

    public setTotalBlocked(value: number) {
        this.data.totalBlocked = value;
        return this.save();
    }

    public setStatisticsData(data: PageStatsData) {
        this.data.data = data;
        this.save();
    }

    /**
     * Returns page statistics data object
     */
    public getStatisticsData() {
        /**
         * If page stats data is not defined, creates new
         */
        if (!this.data.data) {
            this.setStatisticsData(PageStatsStorage.createStatsData(null, 0));
        }

        return this.data.data;
    }

    /**
    * Creates blocked types to filters relation dictionary
    */
    public static createStatsData(
        groupId: number | null,
        blocked: number,
    ): PageStatsData {
        const data: PageStatsData = {
            hours: [],
            days: [],
            months: [],
            updated: Date.now(),
        };

        for (let i = 1; i < PageStatsStorage.MAX_HOURS_HISTORY; i += 1) {
            data.hours.push(PageStatsStorage.createStatsDataItem(null, 0));
        }

        data.hours.push(PageStatsStorage.createStatsDataItem(groupId, blocked));

        for (let j = 1; j < PageStatsStorage.MAX_DAYS_HISTORY; j += 1) {
            data.days.push(PageStatsStorage.createStatsDataItem(null, 0));
        }

        data.days.push(PageStatsStorage.createStatsDataItem(groupId, blocked));

        for (let k = 1; k < PageStatsStorage.MAX_MONTHS_HISTORY; k += 1) {
            data.months.push(PageStatsStorage.createStatsDataItem(null, 0));
        }

        data.months.push(PageStatsStorage.createStatsDataItem(groupId, blocked));

        return data;
    }

    /**
    * Updates blocked types to filters relation dictionary
    */
    public static updateStatsData(
        groupId: number,
        blocked: number,
        data: PageStatsData,
    ): PageStatsData {
        const lastUpdated = data.updated;
        const timestamp = Date.now();

        if (isSameHour(timestamp, lastUpdated) && data.hours.length > 0) {
            data.hours[data.hours.length - 1] = PageStatsStorage.updateStatsDataItem(
                groupId,
                blocked,
                data.hours[data.hours.length - 1],
            );
        } else {
            let diffHours = differenceInHours(timestamp, lastUpdated);

            while (diffHours >= 2) {
                data.hours.push(PageStatsStorage.createStatsDataItem(null, 0));
                diffHours -= 1;
            }

            data.hours.push(PageStatsStorage.createStatsDataItem(groupId, blocked));
            if (data.hours.length > PageStatsStorage.MAX_HOURS_HISTORY) {
                data.hours = data.hours.slice(-PageStatsStorage.MAX_HOURS_HISTORY);
            }
        }

        if (isSameDay(timestamp, lastUpdated) && data.days.length > 0) {
            data.days[data.days.length - 1] = PageStatsStorage.updateStatsDataItem(
                groupId,
                blocked,
                data.days[data.days.length - 1],
            );
        } else {
            let diffDays = differenceInDays(timestamp, lastUpdated);

            while (diffDays >= 2) {
                data.days.push(PageStatsStorage.createStatsDataItem(null, 0));
                diffDays -= 1;
            }

            data.days.push(PageStatsStorage.createStatsDataItem(groupId, blocked));
            if (data.days.length > PageStatsStorage.MAX_DAYS_HISTORY) {
                data.days = data.days.slice(-PageStatsStorage.MAX_DAYS_HISTORY);
            }
        }

        if (isSameMonth(timestamp, lastUpdated) && data.months.length > 0) {
            data.months[data.months.length - 1] = PageStatsStorage.updateStatsDataItem(
                groupId,
                blocked,
                data.months[data.months.length - 1],
            );
        } else {
            let diffMonths = differenceInMonths(timestamp, lastUpdated);
            while (diffMonths >= 2) {
                data.months.push(PageStatsStorage.createStatsDataItem(null, 0));
                diffMonths -= 1;
            }

            data.months.push(PageStatsStorage.createStatsDataItem(groupId, blocked));
        }

        data.updated = timestamp;
        return data;
    }

    private static createStatsDataItem(
        groupId: number | null,
        blocked: number,
    ): PageStatsDataItem {
        const data = {};

        if (groupId) {
            data[String(groupId)] = blocked;
        }

        data[PageStatsStorage.TOTAL_GROUP_ID] = blocked;
        return data;
    }

    private static updateStatsDataItem(
        groupId: number,
        blocked: number,
        data: PageStatsDataItem,
    ): PageStatsDataItem {
        data[String(groupId)] = (data[String(groupId)] || 0) + blocked;
        data[PageStatsStorage.TOTAL_GROUP_ID] = (data[PageStatsStorage.TOTAL_GROUP_ID] || 0) + blocked;

        return data;
    }
}

export const pageStatsStorage = new PageStatsStorage(
    SettingOption.PAGE_STATISTIC,
    settingsStorage,
);
