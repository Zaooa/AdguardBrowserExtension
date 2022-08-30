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

    public set(filterId: number, data: FilterVersionData) {
        this.data[filterId] = data;

        this.save();
    }

    public delete(filterId: number) {
        delete this.data[filterId];

        this.save();
    }

    public update(data: Record<number, FilterVersionData>, filtersMetadata: CommonFilterMetadata[]) {
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

        this.setData(data);
    }
}

export const filterVersionStorage = new FilterVersionStorage(SettingOption.FILTERS_VERSION_PROP, settingsStorage);
