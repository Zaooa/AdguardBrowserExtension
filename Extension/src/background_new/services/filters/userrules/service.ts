import browser from 'webextension-polyfill';
import {
    MessageType,
    SaveUserRulesMessage,
} from '../../../../common/constants';
import { messageHandler } from '../../../message-handler';
import { Engine } from '../../../engine';
import { SettingsService } from '../../settings';
import { SettingOption } from '../../../../common/settings';
import { UserRulesApi } from './api';

export class UserRulesService {
    static async init() {
        await UserRulesApi.init();

        messageHandler.addListener(MessageType.GET_USER_RULES, UserRulesService.getUserRules);
        messageHandler.addListener(MessageType.GET_USER_RULES_EDITOR_DATA, UserRulesService.getUserRulesEditorData);
        messageHandler.addListener(MessageType.SAVE_USER_RULES, UserRulesService.handleUserRulesSave);
        messageHandler.addListener(MessageType.ADD_USER_RULE, UserRulesService.handleUserRuleAdd);
        messageHandler.addListener(MessageType.REMOVE_USER_RULE, UserRulesService.handleUserRuleRemove);

        Engine.api.onAssistantCreateRule.subscribe(UserRulesService.addUserRule);

        SettingsService.onSettingChange.addListener(
            SettingOption.USER_FILTER_ENABLED,
            UserRulesService.handleEnableStateChange,
        );
    }

    static async getUserRules() {
        const userRules = await UserRulesApi.getUserRules();

        const content = userRules.join('\n');

        return { content, appVersion: browser.runtime.getManifest().version };
    }

    static async getUserRulesEditorData() {
        const userRules = await UserRulesApi.getUserRules();

        const content = userRules.join('\n');

        return {
            userRules: content,
            // settings: settings.getAllSettings(),
        };
    }

    static async addUserRule(rule: string) {
        await UserRulesApi.addUserRule(rule);
        await Engine.update();
    }

    static async handleUserRulesSave(message: SaveUserRulesMessage) {
        const { value } = message.data;

        await UserRulesApi.setUserRules(value.split('\n'));
        await Engine.update();
    }

    static async handleUserRuleAdd(message) {
        const { ruleText } = message.data;

        await UserRulesApi.addUserRule(ruleText);
        await Engine.update();
    }

    static async handleUserRuleRemove(message) {
        const { ruleText } = message.data;

        await UserRulesApi.removeUserRule(ruleText);
        await Engine.update();
    }

    static async handleEnableStateChange() {
        await Engine.update();
    }
}
