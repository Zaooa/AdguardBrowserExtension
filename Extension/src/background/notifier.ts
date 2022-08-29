/**
 * This file is part of Adguard Browser Extension (https://github.com/AdguardTeam/AdguardBrowserExtension).
 *
 * Adguard Browser Extension is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Adguard Browser Extension is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Adguard Browser Extension. If not, see <http://www.gnu.org/licenses/>.
 */

import { log } from '../common/log';
import { NOTIFIER_TYPES } from '../common/constants';

type Listener = (...args: unknown[]) => unknown;

class Notifier {
    private listenerId = 0;

    private eventNotifierEventsMap: Record<string, string> = {};

    private listenersMap: Record<number, Listener> = {};

    private listenersEventsMap: Record<number, Listener> = {};

    /**
     * Make accessible only constants without functions. They will be passed to content-page
     */
    events = NOTIFIER_TYPES;

    constructor() {
        Object.entries(NOTIFIER_TYPES).forEach(([key, value]) => {
            this[key] = value;
            this.eventNotifierEventsMap[value] = key;
        });
    }

    /**
     * Subscribes listener to the specified events
     *
     * @param event    event type listener will be notified of
     * @param listener  Listener callback
     * @returns listener id
     */
    addSpecifiedListener(events, listener: Listener) {
        if (typeof listener !== 'function') {
            throw new Error('Illegal listener');
        }
        const listenerId = this.listenerId + 1;
        this.listenerId = listenerId;
        this.listenersMap[listenerId] = listener;
        this.listenersEventsMap[listenerId] = events;
        return listenerId;
    }

    /**
     * Subscribe specified listener to all events
     *
     * @returns listener id
     */
    addListener(listener: Listener) {
        if (typeof listener !== 'function') {
            throw new Error('Illegal listener');
        }
        const listenerId = this.listenerId + 1;
        this.listenerId = listenerId;
        this.listenersMap[listenerId] = listener;
        return listenerId;
    }

    /**
     * Unsubscribe listener
     * @param listenerId listenerId
     */
    removeListener(listenerId: number) {
        delete this.listenersMap[listenerId];
        delete this.listenersEventsMap[listenerId];
    }

    /**
     * Notifies listeners about the events passed as arguments of this function.
     */
    notifyListeners(...args: [string, ...unknown[]]) {
        const [event] = args;
        if (!event || !(event in this.eventNotifierEventsMap)) {
            throw new Error(`Illegal event: ${event}`);
        }

        Object.entries(
            this.listenersMap as Record<string, Listener>,
        ).forEach(([listenerId, listener]) => {
            const events = this.listenersEventsMap[listenerId];
            if (events && events.length > 0 && events.indexOf(event) < 0) {
                return;
            }
            try {
                listener.apply(listener, args);
            } catch (ex) {
                log.error('Error invoking listener for {0} cause: {1}', event, ex);
            }
        });
    }

    /**
     * Asynchronously notifies all listeners about the events passed as arguments of this function.
     * Some events should be dispatched asynchronously, for instance this is very important for Safari:
     * https://github.com/AdguardTeam/AdguardBrowserExtension/issues/251
     */
    notifyListenersAsync(...args: [string, ...unknown[]]) {
        setTimeout(() => {
            this.notifyListeners(...args);
        }, 500);
    }
}

export const listeners = new Notifier() as Notifier & typeof NOTIFIER_TYPES;
