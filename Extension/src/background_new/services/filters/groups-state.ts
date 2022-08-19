/* eslint-disable no-console */
import { SettingOption } from '../../../common/settings';
import { settingsStorage } from '../settings';
import { metadataStorage } from './metadata';

export type GroupStateData = {
    enabled: boolean;
    toggled: boolean;
};

export class GroupsState {
    static defaultState = {
        enabled: false,
        toggled: false,
    };

    data: Record<number, GroupStateData> = {};

    async init() {
        const groupsMetadata = metadataStorage.getGroups();

        const storageData = settingsStorage.get(SettingOption.GROUPS_STATE_PROP);

        const data = storageData ? JSON.parse(storageData) : {};

        for (let i = 0; i < groupsMetadata.length; i += 1) {
            const { groupId } = groupsMetadata[i] as { groupId: number };

            data[groupId] = data[groupId] || GroupsState.defaultState;
        }

        this.data = data;

        await this.updateStorageData();
    }

    get(groupId: number): GroupStateData | undefined {
        return this.data[groupId];
    }

    async set(groupId: number, data: GroupStateData) {
        this.data[groupId] = data;
        await this.updateStorageData();
    }

    async delete(groupId: number) {
        delete this.data[groupId];
        await this.updateStorageData();
    }

    getEnabledGroups(): number[] {
        return Object
            .entries(this.data)
            .filter(([,state]) => state.enabled)
            .map(([id]) => Number(id));
    }

    async enableGroups(groupIds: number[], toggled = true) {
        for (let i = 0; i < groupIds.length; i += 1) {
            const groupId = groupIds[i];
            this.data[groupId] = {
                enabled: true,
                toggled,
            };
        }

        await this.updateStorageData();
    }

    async disableGroups(groupIds: number[], toggled = true) {
        for (let i = 0; i < groupIds.length; i += 1) {
            const groupId = groupIds[i];
            this.data[groupId] = {
                enabled: false,
                toggled,
            };
        }

        await this.updateStorageData();
    }

    async clear() {
        this.data = {};
        await this.updateStorageData();
    }

    private async updateStorageData() {
        await settingsStorage.set(SettingOption.GROUPS_STATE_PROP, JSON.stringify(this.data));
    }
}

export const groupsState = new GroupsState();
