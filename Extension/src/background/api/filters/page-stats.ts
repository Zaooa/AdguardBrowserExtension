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
import { dates } from '../../utils/dates';
import { translator } from '../../../common/translators/translator';
import { SettingOption } from '../../../common/settings';
import { settingsStorage, metadataStorage } from '../../storages';

export class PageStats {
    public static MAX_HOURS_HISTORY = 24;

    public static MAX_DAYS_HISTORY = 30;

    public static MAX_MONTHS_HISTORY = 3;

    public static TOTAL_GROUP = {
        groupId: 'total',
        groupName: translator.getMessage('popup_statistics_total'),
    };

    public stats: any = {};

    public init() {
        const statsData = settingsStorage.get(SettingOption.PAGE_STATISTIC);

        this.stats = statsData ? JSON.parse(statsData) : {};
    }

    /**
     * Total count of blocked requests
     */
    public getTotalBlocked(): number {
        return this.stats?.totalBlocked || 0;
    }

    /**
     * Updates total count of blocked requests
     *
     * @param blocked Count of blocked requests
     */
    public async updateTotalBlocked(blocked: number) {
        this.stats.totalBlocked = (this.stats.totalBlocked || 0) + blocked;
        await this.updateStorageData();
    }

    /**
     * Resets stats
     */
    public reset(): void {
        this.stats = {};
        settingsStorage.remove(SettingOption.PAGE_STATISTIC);
    }

    /**
     * Updates stats data
     *
     * For every hour/day/month we have an object:
     * {
     *      blockedType: count,
     *      ..,
     *
     *      total: count
     * }
     *
     * We store last 24 hours, 30 days and all past months stats
     *
     * var data = {
     *              hours: [],
     *              days: [],
     *              months: [],
     *              updated: Date };
     *
     * @param filterId
     * @param blocked count
     * @param now date
     */
    public async updateStats(filterId, blocked, now) {
        const blockedGroup = metadataStorage.getGroupByFilterId(filterId);

        if (!blockedGroup) {
            return;
        }

        const { groupId } = blockedGroup;

        let updated;

        if (!this.stats.data) {
            updated = PageStats.createStatsData(now, groupId, blocked);
        } else {
            updated = PageStats.updateStatsData(now, groupId, blocked, this.stats.data);
        }

        this.stats.data = updated;
        await this.updateStorageData();
    }

    /**
     * Returns statistics data object
     * @param {Date} [date] - used in the tests to provide time of stats object creation
     */
    public async getStatisticsData(date = new Date()) {
        if (!this.stats.data) {
            this.stats.data = PageStats.createStatsData(date, null, 0);
            await this.updateStorageData();
        }

        return {
            today: this.stats.data.hours,
            lastWeek: this.stats.data.days.slice(-7),
            lastMonth: this.stats.data.days,
            lastYear: this.stats.data.months.slice(-12),
            overall: this.stats.data.months,
            blockedGroups: PageStats.getGroups(),
        };
    }

    private async updateStorageData(): Promise<void> {
        settingsStorage.set(SettingOption.PAGE_STATISTIC, JSON.stringify(this.stats));
    }

    private static createStatsDataItem(type, blocked) {
        const result = {};
        if (type) {
            result[type] = blocked;
        }
        result[PageStats.TOTAL_GROUP.groupId] = blocked;
        return result;
    }

    /**
    * Creates blocked types to filters relation dictionary
    */
    private static createStatsData(now, type, blocked) {
        const result = Object.create(null);
        result.hours = [];
        result.days = [];
        result.months = [];

        for (let i = 1; i < PageStats.MAX_HOURS_HISTORY; i += 1) {
            result.hours.push(PageStats.createStatsDataItem(null, 0));
        }
        result.hours.push(PageStats.createStatsDataItem(type, blocked));

        for (let j = 1; j < PageStats.MAX_DAYS_HISTORY; j += 1) {
            result.days.push(PageStats.createStatsDataItem(null, 0));
        }
        result.days.push(PageStats.createStatsDataItem(type, blocked));

        for (let k = 1; k < PageStats.MAX_MONTHS_HISTORY; k += 1) {
            result.months.push(PageStats.createStatsDataItem(null, 0));
        }
        result.months.push(PageStats.createStatsDataItem(type, blocked));

        result.updated = now.getTime();

        return result;
    }

    private static updateStatsDataItem(type, blocked, current) {
        current[type] = (current[type] || 0) + blocked;
        current[PageStats.TOTAL_GROUP.groupId] = (current[PageStats.TOTAL_GROUP.groupId] || 0) + blocked;

        return current;
    }

    private static updateStatsData(now, type, blocked, current) {
        const currentDate = new Date(current.updated);

        const result = current;

        if (dates.isSameHour(now, currentDate) && result.hours.length > 0) {
            result.hours[result.hours.length - 1] = PageStats.updateStatsDataItem(
                type,
                blocked,
                result.hours[result.hours.length - 1],
            );
        } else {
            let diffHours = dates.getDifferenceInHours(now, currentDate);

            while (diffHours >= 2) {
                result.hours.push(PageStats.createStatsDataItem(null, 0));
                diffHours -= 1;
            }

            result.hours.push(PageStats.createStatsDataItem(type, blocked));
            if (result.hours.length > PageStats.MAX_HOURS_HISTORY) {
                result.hours = result.hours.slice(-PageStats.MAX_HOURS_HISTORY);
            }
        }

        if (dates.isSameDay(now, currentDate) && result.days.length > 0) {
            result.days[result.days.length - 1] = PageStats.updateStatsDataItem(
                type,
                blocked,
                result.days[result.days.length - 1],
            );
        } else {
            let diffDays = dates.getDifferenceInDays(now, currentDate);

            while (diffDays >= 2) {
                result.days.push(PageStats.createStatsDataItem(null, 0));
                diffDays -= 1;
            }

            result.days.push(PageStats.createStatsDataItem(type, blocked));
            if (result.days.length > PageStats.MAX_DAYS_HISTORY) {
                result.days = result.days.slice(-PageStats.MAX_DAYS_HISTORY);
            }
        }

        if (dates.isSameMonth(now, currentDate) && result.months.length > 0) {
            result.months[result.months.length - 1] = PageStats.updateStatsDataItem(
                type,
                blocked,
                result.months[result.months.length - 1],
            );
        } else {
            let diffMonths = dates.getDifferenceInMonths(now, currentDate);
            while (diffMonths >= 2) {
                result.months.push(PageStats.createStatsDataItem(null, 0));
                diffMonths -= 1;
            }

            result.months.push(PageStats.createStatsDataItem(type, blocked));
        }

        result.updated = now.getTime();
        return result;
    }

    private static getGroups() {
        const groups = metadataStorage.getGroups();

        return [PageStats.TOTAL_GROUP, ...groups.sort((prevGroup, nextGroup) => {
            return prevGroup.displayNumber - nextGroup.displayNumber;
        })];
    }
}

export const pageStats = new PageStats();
