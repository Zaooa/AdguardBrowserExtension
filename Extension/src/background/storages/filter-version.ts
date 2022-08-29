import { SettingOption } from '../../common/settings';
import { StringStorage } from '../utils/string-storage';
import { CommonFilterMetadata } from './metadata';
import { settingsStorage } from './settings';

export type FilterVersionData = {
    version: string,
    lastCheckTime: number,
    lastUpdateTime: number,
    expires: number,
};

export class FilterVersionStorage extends StringStorage<SettingOption, Record<number, FilterVersionData>> {
    public get(filterId: number): FilterVersionData {
        return this.data[filterId];
    }

    public async set(filterId: number, data: FilterVersionData) {
        this.data[filterId] = data;

        await this.save();
    }

    public async delete(filterId: number) {
        delete this.data[filterId];

        await this.save();
    }

    public async update(data: Record<number, FilterVersionData>, filtersMetadata: CommonFilterMetadata[]) {
        for (let i = 0; i < filtersMetadata.length; i += 1) {
            const {
                filterId,
                version,
                expires,
                timeUpdated,
            } = filtersMetadata[i];

            if (!data[filterId]) {
                data[filterId] = {
                    version,
                    expires,
                    lastUpdateTime: new Date(timeUpdated).getTime(),
                    lastCheckTime: Date.now(),
                };
            }
        }

        await this.setData(data);
    }
}

export const filterVersionStorage = new FilterVersionStorage(SettingOption.FILTERS_VERSION_PROP, settingsStorage);
