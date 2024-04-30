const options = {
  preset: "ts-jest",
  resolver: "ts-jest-resolver",
  setupFiles: ["<rootDir>/setupTests.ts"],
  watchPathIgnorePatterns: [".#"],
  testRunner: "jest-jasmine2",
  setupFilesAfterEnv: ["jest-allure/dist/setup"]
};

module.exports = options;
