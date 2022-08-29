import {
    Settings,
    SettingOption,
    ADGUARD_SETTINGS_KEY,
} from '../../common/settings';
import { StorageInterface } from '../../common/storage';
import { storage } from './main';

/**
 * Storage for app settings
 */
export class SettingsStorage implements StorageInterface<SettingOption, Settings[SettingOption]> {
    static saveTimeoutMs = 100;

    settings: Settings;

    /**
     * Set setting to storage
     */
    public set<T extends SettingOption>(key: T, value: Settings[T]): void {
        this.settings[key] = value;
        this.save();
    }

    /**
     * Get setting from  storage
     */
    public get<T extends SettingOption>(key: T): Settings[T] {
        return this.settings[key];
    }

    /**
     * Remove setting from storage
     */
    public remove(key: SettingOption): void {
        if (this.settings[key]) {
            delete this.settings[key];
            this.save();
        }
    }

    /**
     * Set settings to storage
     */
    public setSettings(settings: Settings) {
        this.settings = settings;
        this.save();
    }

    /**
     * Get all settings from storage
     */
    public getSettings(): Partial<Settings> {
        return this.settings;
    }

    /**
     * save settings in browser.storage.local
     */
    private save() {
        storage.set(ADGUARD_SETTINGS_KEY, this.settings);
    }
}

export const settingsStorage = new SettingsStorage();
