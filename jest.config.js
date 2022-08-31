module.exports = {
    verbose: true,
    testEnvironment: 'jsdom',
    setupFiles: ['./tests/__setups__/chrome.js'],
    testRegex: "(/__tests__/.*|\\.(test|spec))\\.(ts|tsx|js)$",
    transformIgnorePatterns: [
        '<rootDir>/node_modules/(?!@adguard/tsurlfilter/dist)',
    ],
};
