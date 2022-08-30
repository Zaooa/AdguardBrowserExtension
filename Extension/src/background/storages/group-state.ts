import { SettingOption } from '../../common/settings';
import { StringStorage } from '../utils/string-storage';
import { GroupMetadata } from './metadata';
import { settingsStorage } from './settings';

export type GroupState = {
    enabled: boolean;
    toggled: boolean;
};

export class GroupStateStorage extends StringStorage<SettingOption, Record<number, GroupState>> {
    private static defaultState = {
        enabled: false,
        toggled: false,
    };

    public get(groupId: number): GroupState {
        return this.data[groupId];
    }

    public set(groupId: number, state: GroupState) {
        this.data[groupId] = state;

        this.save();
    }

    public delete(groupId: number) {
        delete this.data[groupId];

        this.save();
    }

    public getEnabledGroups(): number[] {
        return Object
            .entries(this.data)
            .filter(([,state]) => state.enabled)
            .map(([id]) => Number(id));
    }

    public enableGroups(groupIds: number[], toggled = true) {
        for (let i = 0; i < groupIds.length; i += 1) {
            const groupId = groupIds[i];
            this.data[groupId] = {
                enabled: true,
                toggled,
            };
        }

        this.save();
    }

    public disableGroups(groupIds: number[], toggled = true) {
        for (let i = 0; i < groupIds.length; i += 1) {
            const groupId = groupIds[i];
            this.data[groupId] = {
                enabled: false,
                toggled,
            };
        }

        this.save();
    }

    public update(states: Record<number, GroupState>, groupsMetadata: GroupMetadata[]) {
        for (let i = 0; i < groupsMetadata.length; i += 1) {
            const { groupId } = groupsMetadata[i];

            if (!states[groupId]) {
                states[groupId] = { ...GroupStateStorage.defaultState };
            }
        }

        this.setData(states);
    }
}

export const groupStateStorage = new GroupStateStorage(SettingOption.GROUPS_STATE_PROP, settingsStorage);
