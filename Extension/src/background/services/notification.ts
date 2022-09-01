import { notificationApi } from '../api';

/**
 * Service that manages adguard events notifications.
 * @constructor
 */
export class NotificationService {
    static init() {
        notificationApi.init();

        // TODO: events
    }
}
