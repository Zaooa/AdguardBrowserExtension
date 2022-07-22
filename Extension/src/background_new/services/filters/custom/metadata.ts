import { SettingOption } from '../../../../common/settings';
import { ListStorage } from '../../../storage';
import { settingsStorage } from '../../settings/storage';

export type CustomFilterMetadata = {
    filterId: number,
    groupId: number,
    name: string,
    description: string,
    homepage: string,
    tags: number[],
    customUrl: string,
    trusted: boolean,
    checksum: string | null,
    version: string,
};

export class CustomFilterMetadataStorage {
    private static storage = new ListStorage<SettingOption, CustomFilterMetadata>(
        SettingOption.CUSTOM_FILTERS,
        settingsStorage,
    );

    public static async init() {
        await CustomFilterMetadataStorage.storage.init();
    }

    public static getData(): CustomFilterMetadata[] {
        return CustomFilterMetadataStorage.storage.getData();
    }

    public static getById(filterId: number): CustomFilterMetadata | undefined {
        return CustomFilterMetadataStorage.storage.getData().find(f => f.filterId === filterId);
    }

    public static getByUrl(url: string): CustomFilterMetadata | undefined {
        return CustomFilterMetadataStorage.storage.getData().find(f => f.customUrl === url);
    }

    public static async set(filter: CustomFilterMetadata): Promise<void> {
        const data = CustomFilterMetadataStorage.storage.getData().filter(f => f.filterId !== filter.filterId);

        data.push(filter);

        await this.storage.setData(data);
    }

    public static async remove(filterId: number): Promise<void> {
        const data = this.storage.getData().filter(f => f.filterId !== filterId);
        await this.storage.setData(data);
    }
}
