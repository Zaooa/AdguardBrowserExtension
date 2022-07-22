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
import browser from 'webextension-polyfill';

import { SettingOption } from '../../common/settings';
import { settingsStorage } from '../services/settings';

// TODO: class instead function

/**
 * Extension version (x.x.x)
 * @param version
 * @constructor
 */
const Version = function (version) {
    this.version = Object.create(null);

    const parts = String(version || '').split('.');

    function parseVersionPart(part) {
        if (Number.isNaN(part)) {
            return 0;
        }
        return Math.max(part - 0, 0);
    }

    for (let i = 3; i >= 0; i -= 1) {
        this.version[i] = parseVersionPart(parts[i]);
    }
};

/**
 * Compares with other version
 * @param o
 * @returns {number}
 */
Version.prototype.compare = function (o) {
    for (let i = 0; i < 4; i += 1) {
        if (this.version[i] > o.version[i]) {
            return 1;
        } if (this.version[i] < o.version[i]) {
            return -1;
        }
    }
    return 0;
};

export class BrowserUtils {
    static getExtensionParams(): string[] {
        const clientId = encodeURIComponent(settingsStorage.get(SettingOption.CLIENT_ID));
        const locale = encodeURIComponent(browser.i18n.getUILanguage());
        const version = encodeURIComponent(browser.runtime.getManifest().version);
        const id = encodeURIComponent(browser.runtime.id);
        const params = [];
        params.push(`v=${version}`);
        params.push(`cid=${clientId}`);
        params.push(`lang=${locale}`);
        params.push(`id=${id}`);
        return params;
    }

    /**
     * Retrieve languages from navigator
     */
    static getNavigatorLanguages(limit?: number): string[] {
        let languages = [];
        // https://developer.mozilla.org/ru/docs/Web/API/NavigatorLanguage/languages
        if (Array.isArray(navigator.languages)) {
            // get all languages if 'limit' is not specified
            const langLimit = limit || navigator.languages.length;
            languages = navigator.languages.slice(0, langLimit);
        } else if (navigator.language) {
            languages.push(navigator.language); // .language is first in .languages
        }
        return languages;
    }

    /**
     * Checks if version matches simple (without labels) semantic versioning scheme
     * https://semver.org/
     */
    static isSemver(version: string): boolean {
        const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
        return semverRegex.test(version);
    }

    /**
     * Checks if left version is greater than the right version
     */
    static isGreaterVersion(leftVersion, rightVersion) {
        const left = new Version(leftVersion);
        const right = new Version(rightVersion);
        return left.compare(right) > 0;
    }

    static isGreaterOrEqualsVersion(leftVersion, rightVersion) {
        const left = new Version(leftVersion);
        const right = new Version(rightVersion);
        return left.compare(right) >= 0;
    }
}
