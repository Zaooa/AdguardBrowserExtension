import { SettingOption, Settings } from '../../../common/settings';

export type SettingsListener<T extends keyof Settings> = (value: Settings[T]) => void | Promise<void>;

/**
 * Type-safe mediator for setting options change events
 */
export class SettingsEvents {
    private listenersMap = new Map();

    public addListener<T extends SettingOption>(type: T, listener: SettingsListener<T>) {
        if (this.listenersMap.has(type)) {
            throw new Error(`${type} listener has already been registered`);
        }
        this.listenersMap.set(type, listener);
    }

    public async publishEvent<T extends SettingOption>(type: T, value: Settings[T]) {
        const listener = this.listenersMap.get(type) as SettingsListener<T>;
        if (listener) {
            await listener(value);
        }
    }
}
