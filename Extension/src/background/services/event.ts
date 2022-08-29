import browser from 'webextension-polyfill';
import { listeners } from '../notifier';
import { messageHandler } from '../message-handler';
import { MessageType } from '../../common/messages';

export class EventService {
    eventListeners = {};

    constructor() {
        this.createEventListener = this.createEventListener.bind(this);
    }

    init() {
        messageHandler.addListener(MessageType.CREATE_EVENT_LISTENER, this.createEventListener);
    }

    async createEventListener(message, sender) {
        const { events } = message.data;

        const listenerId = listeners.addSpecifiedListener(events, (...args) => {
            const sender = this.eventListeners[listenerId];
            if (sender) {
                browser.tabs.sendMessage(sender.tab.id, {
                    type: MessageType.NOTIFY_LISTENERS,
                    data: args,
                });
            }
        });

        this.eventListeners[listenerId] = sender;
        return { listenerId };
    }
}

export const eventService = new EventService();
