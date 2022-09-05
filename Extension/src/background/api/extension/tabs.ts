import browser, { Tabs, Windows } from 'webextension-polyfill';
import { Prefs } from '../../prefs';

export type OpenTabProps = Tabs.CreateCreatePropertiesType & {
    /**
     * If tab with url is found, focus it instead create new one
     */
    focusIfHasAlreadyOpened?: boolean,
};

export type OpenWindowProps = Windows.CreateCreateDataType & {
    /**
     * If window with url is found, focus it instead create new one
     */
    focusIfHasAlreadyOpened?: boolean,
};

/**
 * Helper class for browser.tabs API
 */
export class TabsApi {
    static async findOne(queryInfo: Tabs.QueryQueryInfoType): Promise<Tabs.Tab | null> {
        const matchedTabs = await browser.tabs.query(queryInfo);

        if (matchedTabs.length > 0) {
            return matchedTabs[0];
        }

        return null;
    }

    static async focus(tab: Tabs.Tab): Promise<void> {
        const { id, windowId } = tab;

        await browser.tabs.update(id, { active: true });
        await browser.windows.update(windowId, { focused: true });
    }

    static async getAll(): Promise<Tabs.Tab[]> {
        return browser.tabs.query({});
    }

    static async getActive(): Promise<Tabs.Tab | null> {
        return TabsApi.findOne({
            currentWindow: true,
            active: true,
        });
    }

    static async openTab({ focusIfHasAlreadyOpened, url, ...props }: OpenTabProps) {
        if (focusIfHasAlreadyOpened) {
            const tab = await TabsApi.findOne({ url });

            if (tab && !tab.active) {
                await TabsApi.focus(tab);
                return;
            }
        }

        await browser.tabs.create({
            url,
            ...props,
        });
    }

    static async openWindow({ focusIfHasAlreadyOpened, url, ...props }: OpenWindowProps) {
        if (focusIfHasAlreadyOpened) {
            const tab = await TabsApi.findOne({ url });

            if (tab && !tab.active) {
                await TabsApi.focus(tab);
                return;
            }
        }

        await browser.windows.create({
            url,
            ...props,
        });
    }

    public static isExtensionTab(tab: Tabs.Tab): boolean {
        const { url } = tab;

        if (!url) {
            return false;
        }

        let urlProtocol: string;

        try {
            urlProtocol = new URL(url).protocol;
        } catch (e) {
            return false;
        }

        return urlProtocol.indexOf(Prefs.scheme) > -1;
    }
}
