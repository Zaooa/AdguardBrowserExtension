/* eslint-disable no-console */
import browser from 'webextension-polyfill';
import { MessageType } from '../../../common/messages';
import { SettingOption } from '../../../common/settings';
import { messageHandler } from '../../message-handler';
import { settingsStorage } from './storage';
import { UserAgent } from '../../../common/user-agent';
import { AntiBannerFiltersId } from '../../../common/constants';

import { Engine } from '../../engine';
import { Categories } from '../filters/filters-categories';
import { listeners } from '../../notifier';
import { SettingsEvents } from './events';

export class SettingsService {
    static onSettingChange = new SettingsEvents();

    static async init() {
        await settingsStorage.init();
        messageHandler.addListener(MessageType.GET_OPTIONS_DATA, SettingsService.getOptionsData);
        messageHandler.addListener(MessageType.RESET_SETTINGS, SettingsService.resetSettings);
        messageHandler.addListener(MessageType.CHANGE_USER_SETTING, SettingsService.changeUserSettings);

        SettingsService.onSettingChange.addListener(SettingOption.DISABLE_STEALTH_MODE, Engine.update);
        SettingsService.onSettingChange.addListener(SettingOption.HIDE_REFERRER, Engine.update);
        SettingsService.onSettingChange.addListener(SettingOption.HIDE_SEARCH_QUERIES, Engine.update);
        SettingsService.onSettingChange.addListener(SettingOption.SEND_DO_NOT_TRACK, Engine.update);
        SettingsService.onSettingChange.addListener(
            SettingOption.BLOCK_CHROME_CLIENT_DATA,
            Engine.update,
        );
        SettingsService.onSettingChange.addListener(SettingOption.BLOCK_WEBRTC, Engine.update);
        SettingsService.onSettingChange.addListener(
            SettingOption.SELF_DESTRUCT_THIRD_PARTY_COOKIES,
            Engine.update,
        );
        SettingsService.onSettingChange.addListener(
            SettingOption.SELF_DESTRUCT_THIRD_PARTY_COOKIES_TIME,
            Engine.update,
        );
        SettingsService.onSettingChange.addListener(
            SettingOption.SELF_DESTRUCT_FIRST_PARTY_COOKIES,
            Engine.update,
        );
        SettingsService.onSettingChange.addListener(
            SettingOption.SELF_DESTRUCT_FIRST_PARTY_COOKIES_TIME,
            Engine.update,
        );
    }

    static getOptionsData() {
        return Promise.resolve({
            settings: settingsStorage.getData(),
            appVersion: browser.runtime.getManifest().version,
            environmentOptions: {
                isChrome: UserAgent.isChrome,
            },
            constants: {
                AntiBannerFiltersId,
            },
            filtersInfo: {
                rulesCount: Engine.api.getRulesCount(),
            },
            filtersMetadata: Categories.getFiltersMetadata(),
            fullscreenUserRulesEditorIsOpen: false,
        });
    }

    static getConfiguration() {
        return settingsStorage.getConfiguration();
    }

    static async resetSettings() {
        await settingsStorage.reset();
        return true;
    }

    static async changeUserSettings(message) {
        const { key, value } = message.data;
        await settingsStorage.set(key, value);

        await SettingsService.onSettingChange.publishEvent(key, value);

        listeners.notifyListeners(listeners.SETTING_UPDATED, {
            propertyName: key,
            propertyValue: value,
        });
    }
}