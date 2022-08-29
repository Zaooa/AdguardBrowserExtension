import {
    AddAndEnableFilterMessage,
    DisableAntiBannerFilterMessage,
    MessageType,
} from '../../common/constants';
import { SettingOption } from '../../common/settings';

import { messageHandler } from '../message-handler';
import { Engine } from '../engine';
import { listeners } from '../notifier';
import { FiltersApi, toasts } from '../api';
import { filterStateStorage, groupStateStorage, settingsStorage } from '../storages';
import { SettingsService } from './settings';

export class FiltersService {
    static async init() {
        // TODO: debounce message events
        messageHandler.addListener(MessageType.ADD_AND_ENABLE_FILTER, FiltersService.onFilterEnable);
        messageHandler.addListener(MessageType.DISABLE_ANTIBANNER_FILTER, FiltersService.onFilterDisable);
        messageHandler.addListener(MessageType.ENABLE_FILTERS_GROUP, FiltersService.onGroupEnable);
        messageHandler.addListener(MessageType.DISABLE_FILTERS_GROUP, FiltersService.onGroupDisable);
        messageHandler.addListener(MessageType.CHECK_ANTIBANNER_FILTERS_UPDATE, FiltersService.onFiltersUpdate);

        SettingsService.onSettingChange.addListener(
            SettingOption.USE_OPTIMIZED_FILTERS,
            FiltersService.onOptimizedFiltersSwitch,
        );
    }

    static async onFilterEnable(message: AddAndEnableFilterMessage) {
        const { filterId } = message.data;

        await FiltersApi.loadAndEnableFilters([filterId]);

        await Engine.update();
    }

    static async onFilterDisable(message: DisableAntiBannerFilterMessage) {
        const { filterId } = message.data;

        await filterStateStorage.disableFilters([filterId]);

        await Engine.update();
    }

    static async onGroupEnable(message) {
        const { groupId } = message.data;

        await groupStateStorage.enableGroups([groupId]);
        await Engine.update();
    }

    static async onGroupDisable(message) {
        const { groupId } = message.data;

        await groupStateStorage.disableGroups([groupId]);
        await Engine.update();
    }

    static async onFiltersUpdate() {
        try {
            const enabledFilters = FiltersApi.getEnabledFilters();

            const updatedFilters = await FiltersApi.updateFilters(enabledFilters);

            await filterStateStorage.enableFilters(enabledFilters);

            await Engine.update();

            toasts.showFiltersUpdatedAlertMessage(true, updatedFilters);
            listeners.notifyListeners(listeners.FILTERS_UPDATE_CHECK_READY, updatedFilters);

            return updatedFilters;
        } catch (e) {
            toasts.showFiltersUpdatedAlertMessage(false);
            listeners.notifyListeners(listeners.FILTERS_UPDATE_CHECK_READY);
        }
    }

    static async onOptimizedFiltersSwitch() {
        await FiltersApi.reloadEnabledFilters();
        await Engine.update();
    }
}
