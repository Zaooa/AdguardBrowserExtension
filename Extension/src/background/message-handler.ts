import browser, { Events, Runtime } from 'webextension-polyfill';
import { Engine, EngineMessage } from './engine';

import {
    MessageType,
    Message,
    ExtractedMessage,
    APP_MESSAGE_HANDLER_NAME,
    FILTERING_LOG,
    FULLSCREEN_USER_RULES_EDITOR,
} from '../common/constants';
import { log } from '../common/log';
import { listeners } from './notifier';
import { filteringLogApi } from './api';
import { fullscreenUserRulesEditor } from './services';

type MessageListener<T> = (message: T, sender: Runtime.MessageSender) => unknown;

export class MessageHandler {
  private messageListeners = new Map();

  constructor() {
      this.handleMessage = this.handleMessage.bind(this);
  }

  public init() {
      (browser.runtime.onMessage as Events.Event<MessageListener<Message>>).addListener(this.handleMessage);
      (browser.runtime.onConnect).addListener(MessageHandler.handleConnection);
  }

  public addListener<T extends MessageType>(type: T, listener: MessageListener<ExtractedMessage<T>>) {
      if (this.messageListeners.has(type)) {
          throw new Error(`${type} listener has already been registered`);
      }

      this.messageListeners.set(type, listener);
  }

  public removeListener<T extends MessageType>(type: T) {
      this.messageListeners.delete(type);
  }

  // TODO: runtime validation
  private handleMessage<T extends Message | EngineMessage>(message: T, sender: Runtime.MessageSender) {
      if (message.handlerName === Engine.messageHandlerName) {
          return Engine.messageHandler(message, sender);
      }

      if (message.handlerName === APP_MESSAGE_HANDLER_NAME) {
          const listener = this.messageListeners.get(message.type) as MessageListener<T>;
          if (listener) {
              return Promise.resolve(listener(message, sender));
          }
      }
  }

  // TODO: separate class

  private static handleConnection(port) {
      let listenerId;

      log.info(`Port: "${port.name}" connected`);

      MessageHandler.onPortConnection(port);

      port.onMessage.addListener((message) => {
          const { type, data } = message;
          if (type === MessageType.ADD_LONG_LIVED_CONNECTION) {
              const { events } = data;
              listenerId = listeners.addSpecifiedListener(events, async (...data) => {
                  const type = MessageType.NOTIFY_LISTENERS;
                  try {
                      port.postMessage({ type, data });
                  } catch (e) {
                      log.error(e.message);
                  }
              });
          }
      });

      port.onDisconnect.addListener(() => {
          MessageHandler.onPortDisconnection(port);
          listeners.removeListener(listenerId);
          log.info(`Port: "${port.name}" disconnected`);
      });
  }

  private static onPortConnection(port) {
      switch (true) {
          case port.name.startsWith(FILTERING_LOG): {
              filteringLogApi.onOpenFilteringLogPage();
              break;
          }

          case port.name.startsWith(FULLSCREEN_USER_RULES_EDITOR): {
              fullscreenUserRulesEditor.onOpenPage();
              break;
          }

          default: {
              throw new Error(`There is no such pages ${port.name}`);
          }
      }
  }

  private static onPortDisconnection(port) {
      switch (true) {
          case port.name.startsWith(FILTERING_LOG): {
              filteringLogApi.onCloseFilteringLogPage();
              break;
          }

          case port.name.startsWith(FULLSCREEN_USER_RULES_EDITOR): {
              fullscreenUserRulesEditor.onClosePage();
              break;
          }

          default: {
              throw new Error(`There is no such pages ${port.name}`);
          }
      }
  }
}

export const messageHandler = new MessageHandler();
