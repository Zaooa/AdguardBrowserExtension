import { Action } from 'webextension-polyfill';

const cache = new Map<string, ImageData>();

/**
 * Download image and convert it to ImageData
 *
 * @param size - icon size in px
 * @param url - icon url
 */
function loadImageData(size: number, url: string): Promise<ImageData> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = url;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            document.documentElement.appendChild(canvas);
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const data = ctx.getImageData(0, 0, size, size);
            canvas.remove();
            resolve(data);
        };
        img.onerror = reject;
    });
}

/**
 * Get ImageData for specific url
 *
 * @param size - icon size in px
 * @param url - icon url
 */
async function getImageData(size: string, url: string) : Promise<[string, ImageData]> {
    const imageData = cache.get(url);
    if (!imageData) {
        const data = await loadImageData(Number(size), url);
        cache.set(url, data);
        return [size, data];
    }

    return [size, imageData];
}

/**
 * Match urls from browserAction.setIcon 'path' property with cached ImageData values
 * and return 'imageData' object for this action.
 *
 * see: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/browserAction/setIcon
 *
 * @param path - browserAction.setIcon details 'path' property
 */
export async function getIconImageData(path: Record<string, string>) {
    const imageDataEntriesPromises = Object.entries(path).map(([size, url]) => getImageData(size, url));

    const imageDataEntries = await Promise.all(imageDataEntriesPromises);

    return Object.fromEntries(imageDataEntries) as Record<string, Action.ImageDataType>;
}
