const options = {
  preset: "ts-jest",
  resolver: "ts-jest-resolver",
  setupFiles: ["<rootDir>/setupTests.ts"],
  watchPathIgnorePatterns: [".#"]
};

module.exports = options;
