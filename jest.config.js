const options = {
  preset: "ts-jest",
  resolver: "ts-jest-resolver",
  setupFiles: ["<rootDir>/setupTests.ts"],
  watchPathIgnorePatterns: [".#"],
  testEnvironment: "allure-jest/node",
  testEnvironmentOptions: {
    resultsDir: "./allure-results",
    // shortcut: msw 1.x interceptors recurse under Jest 30 globals cleanup on Node 20; drop after msw 2+ migration
    globalsCleanup: "off"
  }
};

module.exports = options;
