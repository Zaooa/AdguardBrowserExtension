import { UrlUtils } from '../../../../../Extension/src/background/utils/url';
import { SafebrowsingApi } from '../../../../../Extension/src/background/api/safebrowsing';
import { ExtensionXMLHttpRequest, network } from '../../../../../Extension/src/background/api/network';
import { log } from '../../../../../Extension/src/common/log';

// TODO: fix

describe('safebrowsing', () => {
    it('Calculate hash', () => {
        const host = UrlUtils.getHost('http://test.yandex.ru/someurl.html');
        const hosts = SafebrowsingApi.extractHosts(host);

        expect(hosts[0]).toBe('test.yandex.ru');
        expect('yandex.ru').toBe(hosts[1]);

        const hashes = SafebrowsingApi.createHashesMap(hosts);

        expect(hashes['7FF9C98C9AABC19DDB67F8A0030B0691451738E7B8E75393BC6C9F6137F269BB']).toBe('test.yandex.ru');
        expect(hashes['A42653DA210A54B6874F37F0D4A12DA5E89BB436F2C6A01F83246E71CDB544E5']).toBe('yandex.ru');
    });

    it('Process response', () => {
        const host = UrlUtils.getHost('http://theballoonboss.com');
        const hosts = SafebrowsingApi.extractHosts(host);
        const hashes = SafebrowsingApi.createHashesMap(hosts);

        // eslint-disable-next-line max-len
        const sbList = SafebrowsingApi.processSbResponse('adguard-phishing-shavar:37654:B8DC93970348F0A3E6856C32AC5C04D5655E5EE17D4169EC51A2102FB6D5E12A\nadguard-malware-shavar:35176:AE617C8343E1C79E27515B3F6D6D26413FCE47AE32A73488F9D033B4D2A46B3D\nadguard-phishing-shavar:35071:AE617C8343E1C79E27515B3F6D6D26413FCE47AE32A73488F9D033B4D2A46B3D', hashes);

        expect(sbList).toBe('adguard-phishing-shavar');
    });

    it('Test cache', async () => {
        let counter = 0;
        // Mock backend request
        jest.spyOn(network, 'lookupSafebrowsing').mockImplementation(() => {
            counter += 1;

            return Promise.resolve({ status: 204 }) as unknown as Promise<ExtensionXMLHttpRequest>;
        });

        const testUrl = 'http://google.com';
        const response = await SafebrowsingApi.lookupUrl(testUrl);
        expect(response).toBeFalsy();
        expect(counter).toBe(1);

        const response2 = await SafebrowsingApi.lookupUrl(testUrl);
        expect(response2).toBeFalsy();
        // Check there was only one request to backend
        expect(counter).toBe(1);
    });

    it('Test requests cache', async () => {
        let counter = 0;
        let hashesChecked = [];

        // Mock backend request
        jest.spyOn(network, 'lookupSafebrowsing').mockImplementation((shortHashes: string[]) => {
            counter += 1;
            hashesChecked = shortHashes;

            return Promise.resolve({
                status: 204,
            }) as unknown as Promise<ExtensionXMLHttpRequest>;
        });

        const testUrlOne = 'http://google.co.jp';
        const testUrlTwo = 'http://yahoo.co.jp';
        const testUrlThree = 'http://co.jp';
        let response = await SafebrowsingApi.lookupUrl(testUrlOne);

        expect(!response).toBeTruthy();
        expect(counter).toBe(1);
        expect(hashesChecked.length).toBe(2);
        expect(hashesChecked[0]).toBe('6830');
        expect(hashesChecked[1]).toBe('D617');

        hashesChecked = [];

        response = await SafebrowsingApi.lookupUrl(testUrlTwo);
        expect(!response).toBeTruthy();
        // One new hash added
        expect(counter).toBe(2);
        expect(hashesChecked.length).toBe(1);
        expect(hashesChecked[0]).toBe('20E4');

        hashesChecked = [];

        response = await SafebrowsingApi.lookupUrl(testUrlThree);
        expect(!response).toBeTruthy();
        // All hashes have been checked already - so there was no request to backend
        expect(counter).toBe(2);
        expect(hashesChecked.length).toBe(0);
    });

    it('Handle lookup server network errors', async () => {
        const logSpy = jest.spyOn(log, 'error');

        // request error handling

        jest.spyOn(network, 'lookupSafebrowsing').mockImplementation(() => {
            // eslint-disable-next-line prefer-promise-reject-errors
            return Promise.reject({
                status: 500,
            });
        });

        await SafebrowsingApi.lookupUrl('https://example.org');

        // eslint-disable-next-line max-len
        expect(logSpy).toHaveBeenCalledWith(
            'Error response from safebrowsing lookup server for {0}',
            'example.org',
        );

        // 5xx status code

        jest.spyOn(network, 'lookupSafebrowsing').mockImplementation(() => {
            return Promise.resolve({
                status: 500,
            }) as unknown as Promise<ExtensionXMLHttpRequest>;
        });

        await SafebrowsingApi.lookupUrl('https://example.com');

        expect(logSpy).toHaveBeenCalledWith(
            'Error response status {0} received from safebrowsing lookup server.',
            500,
        );

        // request resolve without response

        jest.spyOn(network, 'lookupSafebrowsing').mockImplementation(() => {
            return Promise.resolve() as unknown as Promise<ExtensionXMLHttpRequest>;
        });

        await SafebrowsingApi.lookupUrl('https://npmjs.com');

        expect(logSpy).toHaveBeenCalledWith('Can`t read response from the server');
    });
});
