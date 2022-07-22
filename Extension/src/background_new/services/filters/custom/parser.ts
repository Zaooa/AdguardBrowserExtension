export type CustomFilterParsedData = {
    name: string,
    description: string,
    homepage: string,
    version: string,
    expires: string,
    timeUpdated: string,
};

export class CustomFilterParser {
    /**
     * Amount of lines to parse metadata from filter's header
     */
    private static AMOUNT_OF_LINES_TO_PARSE = 50;

    /**
     * Parses filter metadata from rules header
     *
     * @param rules
     */
    static parseFilterDataFromHeader(rules: string[]): CustomFilterParsedData {
        return {
            name: CustomFilterParser.parseTag('Title', rules),
            description: CustomFilterParser.parseTag('Description', rules),
            homepage: CustomFilterParser.parseTag('Homepage', rules),
            version: CustomFilterParser.parseTag('Version', rules),
            expires: CustomFilterParser.parseTag('Expires', rules),
            timeUpdated: CustomFilterParser.parseTag('TimeUpdated', rules),
        };
    }

    private static parseTag(tagName: string, rules: string[]): string {
        let result = '';

        // Look up no more than 50 first lines
        const maxLines = Math.min(CustomFilterParser.AMOUNT_OF_LINES_TO_PARSE, rules.length);
        for (let i = 0; i < maxLines; i += 1) {
            const rule = rules[i];
            const search = `! ${tagName}: `;
            const indexOfSearch = rule.indexOf(search);
            if (indexOfSearch >= 0) {
                result = rule.substring(indexOfSearch + search.length);
            }
        }

        if (tagName === 'Expires') {
            result = String(CustomFilterParser.parseExpiresStr(result));
        }

        if (tagName === 'TimeUpdated') {
            result = result || new Date().toISOString();
        }

        return result;
    }

    /**
     * Parses expires string in meta
     */
    private static parseExpiresStr(str: string): number {
        const regexp = /(\d+)\s+(day|hour)/;

        const parseRes = str.match(regexp);

        if (!parseRes) {
            const parsed = Number.parseInt(str, 10);
            return Number.isNaN(parsed) ? 0 : parsed;
        }

        const [, num, period] = parseRes;

        let multiplier = 1;
        switch (period) {
            case 'day': {
                multiplier = 24 * 60 * 60;
                break;
            }
            case 'hour': {
                multiplier = 60 * 60;
                break;
            }
            default: {
                break;
            }
        }

        return Number(num) * multiplier;
    }
}
