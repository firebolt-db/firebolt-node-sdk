const options = {
  preset: "ts-jest",
  resolver: "ts-jest-resolver",
  setupFiles: ["<rootDir>/setupTests.ts"],
  watchPathIgnorePatterns: [".#"],
  testEnvironment: "allure-jest/node",
  testEnvironmentOptions: {
    resultsDir: "./allure-results"
  }
};

module.exports = options;
