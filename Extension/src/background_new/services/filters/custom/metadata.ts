import { SettingOption } from '../../../../common/settings';
import { StringStorage } from '../../../storage';
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
    expires: number,
    timeUpdated: number,
};

/**
 * Storage for custom filters metadata
 */
export class CustomFilterMetadataStorage extends StringStorage<SettingOption, CustomFilterMetadata[]> {
    /**
     * Get custom filter metadata by filter id
     */
    getById(filterId: number): CustomFilterMetadata | undefined {
        return this.getData().find(f => f.filterId === filterId);
    }

    /**
     * Get custom filter metadata by filter subscription url
     */
    public getByUrl(url: string): CustomFilterMetadata | undefined {
        return this.getData().find(f => f.customUrl === url);
    }

    /**
     * Set custom filter metadata with filterId key
     */
    public async set(filter: CustomFilterMetadata): Promise<void> {
        const data = this.getData().filter(f => f.filterId !== filter.filterId);

        data.push(filter);

        await this.setData(data);
    }

    /**
     * Remove custom filter metadata
     */
    public async remove(filterId: number): Promise<void> {
        const data = this.getData().filter(f => f.filterId !== filterId);
        await this.setData(data);
    }
}

export const customFilterMetadataStorage = new CustomFilterMetadataStorage(
    SettingOption.CUSTOM_FILTERS,
    settingsStorage,
);
