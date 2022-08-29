import { AntiBannerFiltersId } from '../../common/constants';
import { SettingOption } from '../../common/settings';
import { StringStorage } from '../utils/string-storage';
import { CommonFilterMetadata } from './metadata';
import { settingsStorage } from './settings';

export type FilterState = {
    enabled: boolean;
    installed: boolean;
    loaded: boolean;
};

export class FilterStateStorage extends StringStorage<SettingOption, Record<number, FilterState>> {
    /**
     * This filters have own complex state management
     */
    private static unsupportedFiltersIds = [
        AntiBannerFiltersId.ALLOWLIST_FILTER_ID,
        AntiBannerFiltersId.USER_FILTER_ID,
    ];

    private static defaultState = {
        enabled: false,
        installed: false,
        loaded: false,
    };

    public get(filterId: number): FilterState {
        return this.data[filterId];
    }

    public async set(filterId: number, state: FilterState) {
        this.data[filterId] = state;

        await this.save();
    }

    public async setEnabled(filterId: number, enabled: boolean) {
        this.data[filterId].enabled = enabled;

        await this.save();
    }

    public async delete(filterId: number) {
        delete this.data[filterId];

        await this.save();
    }

    public getEnabledFilters(): number[] {
        return Object
            .entries(this.data)
            .filter(([,state]) => state.enabled)
            .map(([id]) => Number(id));
    }

    public async enableFilters(filtersIds: number[]) {
        for (let i = 0; i < filtersIds.length; i += 1) {
            const filterId = filtersIds[i];
            this.data[filterId] = { ...this.data[filterId], enabled: true };
        }

        await this.save();
    }

    public async disableFilters(filtersIds: number[]) {
        for (let i = 0; i < filtersIds.length; i += 1) {
            const filterId = filtersIds[i];
            this.data[filterId] = { ...this.data[filterId], enabled: false };
        }

        await this.save();
    }

    public async update(states: Record<number, FilterState>, filtersMetadata: CommonFilterMetadata[]) {
        /**
         * Don't create filter state context for allowlist and user rules lists
         * Their state is controlled by separate modules
         */
        const supportedFiltersMetadata = filtersMetadata.filter(({ filterId }) => {
            return !FilterStateStorage.unsupportedFiltersIds.includes(filterId);
        });

        for (let i = 0; i < supportedFiltersMetadata.length; i += 1) {
            const { filterId } = supportedFiltersMetadata[i];

            if (!states[filterId]) {
                states[filterId] = { ...FilterStateStorage.defaultState };
            }
        }

        await this.setData(states);
    }
}

export const filterStateStorage = new FilterStateStorage(SettingOption.FILTERS_STATE_PROP, settingsStorage);
