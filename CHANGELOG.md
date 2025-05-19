# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.13.0](https://github.com/firebolt-db/firebolt-node-sdk/compare/v1.12.1...v1.13.0) (2025-05-19)


### Features

* FIR-44270 Support server side prepared statements ([#140](https://github.com/firebolt-db/firebolt-node-sdk/issues/140)) ([82a3b01](https://github.com/firebolt-db/firebolt-node-sdk/commit/82a3b017deab4bc0dcc52a37d76819ac45b37e35))


### Bug Fixes

* **FIR-46131:** Atomic authentication mechanism and token expiry ([#142](https://github.com/firebolt-db/firebolt-node-sdk/issues/142)) ([b47123e](https://github.com/firebolt-db/firebolt-node-sdk/commit/b47123e75d316238939881119b6940c672317b3c))

### [1.12.1](https://github.com/firebolt-db/firebolt-node-sdk/compare/v1.12.0...v1.12.1) (2025-04-29)


### Bug Fixes

* **FIR-44193:** auth concurrency ([#139](https://github.com/firebolt-db/firebolt-node-sdk/issues/139)) ([acd58bd](https://github.com/firebolt-db/firebolt-node-sdk/commit/acd58bd3d12c382fe9aa5c843600969a2323470d))

## [1.12.0](https://github.com/firebolt-db/firebolt-node-sdk/compare/v1.11.1...v1.12.0) (2025-04-24)


### Features

* FIR-43724 implement streaming in node sdk ([#137](https://github.com/firebolt-db/firebolt-node-sdk/issues/137)) ([6efe9f1](https://github.com/firebolt-db/firebolt-node-sdk/commit/6efe9f1713e433f1b0e391e9de26c7ca57dc6f68))

### [1.11.1](https://github.com/firebolt-db/firebolt-node-sdk/compare/v1.11.0...v1.11.1) (2025-02-27)


### Bug Fixes

* **FIR-43901:** correct parsing of nullable bigint columns ([#133](https://github.com/firebolt-db/firebolt-node-sdk/issues/133)) ([16c9a50](https://github.com/firebolt-db/firebolt-node-sdk/commit/16c9a502365112c1b340a388049f54641fe427fd))

## [1.11.0](https://github.com/firebolt-db/firebolt-node-sdk/compare/v1.10.0...v1.11.0) (2025-02-12)


### Features

* **FIR-42859:** async query execution ([#130](https://github.com/firebolt-db/firebolt-node-sdk/issues/130)) ([9cc6583](https://github.com/firebolt-db/firebolt-node-sdk/commit/9cc658337f264269defd7e0123bf72d5a92fae6b))


### Bug Fixes

* **FIR-43473:** stop engine without starting it again ([#132](https://github.com/firebolt-db/firebolt-node-sdk/issues/132)) ([a4b05de](https://github.com/firebolt-db/firebolt-node-sdk/commit/a4b05de12f48ffa49c41ce616b186f19847b52aa))

## [1.10.0](https://github.com/firebolt-db/firebolt-node-sdk/compare/v1.9.1...v1.10.0) (2025-01-29)


### Features

* FIR-42655 firebolt node sdk draining engine status not recognized ([#129](https://github.com/firebolt-db/firebolt-node-sdk/issues/129)) ([9045ee2](https://github.com/firebolt-db/firebolt-node-sdk/commit/9045ee2d7b2b582481f432d1f98e9ba96c6de0f8))

### [1.9.1](https://github.com/firebolt-db/firebolt-node-sdk/compare/v1.9.0...v1.9.1) (2024-12-20)


### Bug Fixes

* **FIR-38127:** special case for struct ([#128](https://github.com/firebolt-db/firebolt-node-sdk/issues/128)) ([072f894](https://github.com/firebolt-db/firebolt-node-sdk/commit/072f894577c49db882d0b6a5411ecd9792e3af38))

## [1.9.0](https://github.com/firebolt-db/firebolt-node-sdk/compare/v1.8.0...v1.9.0) (2024-12-19)


### Features

* **FIR-38127:** Add struct support ([#125](https://github.com/firebolt-db/firebolt-node-sdk/issues/125)) ([b405435](https://github.com/firebolt-db/firebolt-node-sdk/commit/b405435187169822b4028f3e3ada2fbc3a35ca51))

## [1.8.0](https://github.com/firebolt-db/firebolt-node-sdk/compare/v1.7.3...v1.8.0) (2024-10-15)


### Features

* **FIR-37168:** testConnection doesn't reset autostop timer ([#122](https://github.com/firebolt-db/firebolt-node-sdk/issues/122)) ([879a805](https://github.com/firebolt-db/firebolt-node-sdk/commit/879a805eff4418fa462f78ea21cc8c5914e31ed0))

### [1.7.3](https://github.com/firebolt-db/firebolt-node-sdk/compare/v1.7.2...v1.7.3) (2024-10-02)


### Bug Fixes

* **FIR-37001:** fix parameter formatting for new FB version ([#119](https://github.com/firebolt-db/firebolt-node-sdk/issues/119)) ([9e383ae](https://github.com/firebolt-db/firebolt-node-sdk/commit/9e383aeced86286d9104b3c9a8a1e161e28827d6))

### [1.7.2](https://github.com/firebolt-db/firebolt-node-sdk/compare/v1.7.1...v1.7.2) (2024-09-02)

### [1.7.1](https://github.com/firebolt-db/firebolt-node-sdk/compare/v1.7.0...v1.7.1) (2024-08-29)


### Bug Fixes

* FIR-36189 nest js script stuck when running a query with limit 58 and above ([#115](https://github.com/firebolt-db/firebolt-node-sdk/issues/115)) ([54ccc50](https://github.com/firebolt-db/firebolt-node-sdk/commit/54ccc50d2a8e5bfdc5e3b6b716abd0f20485a617))

## [1.7.0](https://github.com/firebolt-db/firebolt-node-sdk/compare/v1.6.0...v1.7.0) (2024-07-22)


### Features

* Fir 33388 cache account id and system engine url in node sdk ([#102](https://github.com/firebolt-db/firebolt-node-sdk/issues/102)) ([5bf24b1](https://github.com/firebolt-db/firebolt-node-sdk/commit/5bf24b1a6a2fa5199e7320de08892b3a1657b812))
* Fir 33645 replace i s databases with i s catalogs in drivers for node sdk ([#108](https://github.com/firebolt-db/firebolt-node-sdk/issues/108)) ([e84787a](https://github.com/firebolt-db/firebolt-node-sdk/commit/e84787a95a25af9a1a90a0df47abe0a94ac67c57))
* **FIR-33628:** Parsing composite error from response body ([#105](https://github.com/firebolt-db/firebolt-node-sdk/issues/105)) ([47eb762](https://github.com/firebolt-db/firebolt-node-sdk/commit/47eb762f5eb12f8644f357f7ba3af4f039604600))


### Bug Fixes

* **FIR-34534:** Properly parsing bigint ([#111](https://github.com/firebolt-db/firebolt-node-sdk/issues/111)) ([4ffd909](https://github.com/firebolt-db/firebolt-node-sdk/commit/4ffd9094d79fb310778e7e0d3abf624f18f52ab6))

## [1.6.0](https://github.com/firebolt-db/firebolt-node-sdk/compare/v1.5.0...v1.6.0) (2024-06-04)


### Features

* Engine intially stopped option ([#96](https://github.com/firebolt-db/firebolt-node-sdk/issues/96)) ([4111703](https://github.com/firebolt-db/firebolt-node-sdk/commit/4111703cfca200c6833505e101607b6e815627e5))


### Bug Fixes

* Fix engine status parsing for engine get metods ([#95](https://github.com/firebolt-db/firebolt-node-sdk/issues/95)) ([2db5627](https://github.com/firebolt-db/firebolt-node-sdk/commit/2db5627125786b825d2e873f14885468c356ca30))

## [1.5.0](https://github.com/firebolt-db/firebolt-node-sdk/compare/v1.4.1...v1.5.0) (2024-05-27)


### Features

* In memory token caching ([#94](https://github.com/firebolt-db/firebolt-node-sdk/issues/94)) ([974c9f3](https://github.com/firebolt-db/firebolt-node-sdk/commit/974c9f3b37dea3838ba6948d5ab5656a481d02d0))


### Bug Fixes

* add support for engine v2 statuses ([#92](https://github.com/firebolt-db/firebolt-node-sdk/issues/92)) ([9a0aab0](https://github.com/firebolt-db/firebolt-node-sdk/commit/9a0aab0ae4e4e66379683d1dc153f223c78e5389))

### [1.4.1](https://github.com/firebolt-db/firebolt-node-sdk/compare/v1.4.0...v1.4.1) (2024-05-22)


### Bug Fixes

* reenable attach to database ([#90](https://github.com/firebolt-db/firebolt-node-sdk/issues/90)) ([92c96ea](https://github.com/firebolt-db/firebolt-node-sdk/commit/92c96eab879f6d0d08a09cb060e1a8c02d444397))
* Skip empty engine parameters ([#91](https://github.com/firebolt-db/firebolt-node-sdk/issues/91)) ([038a572](https://github.com/firebolt-db/firebolt-node-sdk/commit/038a5722e1a24258a749eb205d087ab251f5059c))

## [1.4.0](https://github.com/firebolt-db/firebolt-node-sdk/compare/v1.3.2...v1.4.0) (2024-05-20)


### Features

* Add internal options to engine create ([#89](https://github.com/firebolt-db/firebolt-node-sdk/issues/89)) ([8e91465](https://github.com/firebolt-db/firebolt-node-sdk/commit/8e91465021ce9f3a62a0e0398e7f178bb471e7f1))

### [1.3.2](https://github.com/firebolt-db/firebolt-node-sdk/compare/v1.3.1...v1.3.2) (2024-04-30)

### [1.3.1](https://github.com/firebolt-db/firebolt-node-sdk/compare/v1.3.0...v1.3.1) (2024-04-22)


### Bug Fixes

* update how we iterate meta in hydrateRow ([#85](https://github.com/firebolt-db/firebolt-node-sdk/issues/85)) ([5ab89d5](https://github.com/firebolt-db/firebolt-node-sdk/commit/5ab89d505eb9f81a93bd1c1812b80799bee927a5))

## [1.3.0](https://github.com/firebolt-db/firebolt-node-sdk/compare/v1.2.0...v1.3.0) (2024-04-17)


### Features

* Fir 29768 add support for set statements in node sdk ([#83](https://github.com/firebolt-db/firebolt-node-sdk/issues/83)) ([fd58b0e](https://github.com/firebolt-db/firebolt-node-sdk/commit/fd58b0e7c3ef164b91cd4069099e03015a379ca4))
* Fir 31841 dont append account id for system engine url in node sdk ([#82](https://github.com/firebolt-db/firebolt-node-sdk/issues/82)) ([08b8245](https://github.com/firebolt-db/firebolt-node-sdk/commit/08b8245e111113ecdda550d15abd8bb928e4a1d8))

## [1.2.0](https://github.com/firebolt-db/firebolt-node-sdk/compare/v1.1.0...v1.2.0) (2024-03-26)


### Features

* Fir 30153 support use engine in node sdk ([#78](https://github.com/firebolt-db/firebolt-node-sdk/issues/78)) ([ca753db](https://github.com/firebolt-db/firebolt-node-sdk/commit/ca753dbbe5735e12d78a81a081696c1664369830))


### Bug Fixes

* bytea formatting for new ff  ([#80](https://github.com/firebolt-db/firebolt-node-sdk/issues/80)) ([22f936f](https://github.com/firebolt-db/firebolt-node-sdk/commit/22f936f02b6d7c55dcac9073635104b8003b2dea))
* Fir 30653 update bytea formatting in node sdk ([#79](https://github.com/firebolt-db/firebolt-node-sdk/issues/79)) ([19cc266](https://github.com/firebolt-db/firebolt-node-sdk/commit/19cc2666dd57489512d91df8eb9b6915c7e65c09))

## [1.1.0](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.2.5...v1.1.0) (2024-01-15)


### Features

* new identity support ([#43](https://github.com/firebolt-db/firebolt-node-sdk/issues/43)) ([a742cd6](https://github.com/firebolt-db/firebolt-node-sdk/commit/a742cd66fbcca9ef712ab07d43c5d9fbb1126119))
* support create delete and attach database and engine ([#56](https://github.com/firebolt-db/firebolt-node-sdk/issues/56)) ([3bbc573](https://github.com/firebolt-db/firebolt-node-sdk/commit/3bbc5738507260a4e05e023903972b930e42f632))

## [1.0.0](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.2.5...v1.0.0) (2023-11-08)


### Features

* new identity support ([#43](https://github.com/firebolt-db/firebolt-node-sdk/issues/43)) ([a742cd6](https://github.com/firebolt-db/firebolt-node-sdk/commit/a742cd66fbcca9ef712ab07d43c5d9fbb1126119))
* support create delete and attach database and engine ([#56](https://github.com/firebolt-db/firebolt-node-sdk/issues/56)) ([3bbc573](https://github.com/firebolt-db/firebolt-node-sdk/commit/3bbc5738507260a4e05e023903972b930e42f632))

## [1.0.0-alpha.0](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.2.5...v1.0.0-alpha.0) (2023-11-08)


### Features

* new identity support ([#43](https://github.com/firebolt-db/firebolt-node-sdk/issues/43)) ([a742cd6](https://github.com/firebolt-db/firebolt-node-sdk/commit/a742cd66fbcca9ef712ab07d43c5d9fbb1126119))
* support create delete and attach database and engine ([#56](https://github.com/firebolt-db/firebolt-node-sdk/issues/56)) ([3bbc573](https://github.com/firebolt-db/firebolt-node-sdk/commit/3bbc5738507260a4e05e023903972b930e42f632))

### [0.2.5](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.2.4...v0.2.5) (2023-07-13)

### [0.2.4](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.2.3...v0.2.4) (2023-06-20)

### [0.2.3](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.2.2...v0.2.3) (2023-04-13)

### [0.2.2](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.2.1...v0.2.2) (2023-04-12)


### Bug Fixes

* github actions proper file extensions ([83f5777](https://github.com/firebolt-db/firebolt-node-sdk/commit/83f57779ea8628482123ddcb77f7cc1c84447222))

### [0.2.1](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.1.21...v0.2.1) (2023-03-10)

### [0.1.21](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.1.19...v0.1.21) (2023-03-02)

### [0.1.19](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.1.18...v0.1.19) (2023-02-15)

### [0.1.18](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.1.17...v0.1.18) (2023-01-19)

### [0.1.17](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.1.16...v0.1.17) (2023-01-16)

### [0.1.16](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.1.14...v0.1.16) (2022-11-28)

### [0.1.14](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.1.13...v0.1.14) (2022-09-13)

### [0.1.13](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.1.12...v0.1.13) (2022-09-08)

### [0.1.12](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.1.11...v0.1.12) (2022-08-30)

### [0.1.11](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.1.10...v0.1.11) (2022-08-30)

### [0.1.10](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.1.9...v0.1.10) (2022-08-30)

### [0.1.9](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.1.8...v0.1.9) (2022-08-30)

### [0.1.8](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.1.7...v0.1.8) (2022-08-30)

### [0.1.7](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.1.6...v0.1.7) (2022-08-09)

### [0.1.6](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.1.5...v0.1.6) (2022-08-03)

### [0.1.5](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.1.4...v0.1.5) (2022-07-27)

### [0.1.4](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.1.3...v0.1.4) (2022-07-26)


### Features

* Usage tracking ([#17](https://github.com/firebolt-db/firebolt-node-sdk/issues/17)) ([a457184](https://github.com/firebolt-db/firebolt-node-sdk/commit/a457184f31f52873c9545375206df72fe77f431b))

### [0.1.3](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.1.2...v0.1.3) (2022-06-30)

### [0.1.2](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.1.1...v0.1.2) (2022-05-19)

### [0.1.1](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.0.26...v0.1.1) (2022-05-19)

### [0.0.26](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.0.25...v0.0.26) (2022-05-15)

### [0.0.25](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.0.24...v0.0.25) (2022-05-15)

### [0.0.24](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.0.23...v0.0.24) (2022-05-04)


### Features

* Merge pull request [#16](https://github.com/firebolt-db/firebolt-node-sdk/issues/16) from firebolt-db/query-bindings ([76d27cb](https://github.com/firebolt-db/firebolt-node-sdk/commit/76d27cb42fff155f4f4ac41772da5fbb7c623993))

### [0.0.23](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.0.22...v0.0.23) (2022-03-23)

### [0.0.22](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.0.21...v0.0.22) (2022-03-23)

### [0.0.21](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.0.20...v0.0.21) (2022-03-22)

### [0.0.20](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.0.19...v0.0.20) (2022-03-18)

### [0.0.19](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.0.18...v0.0.19) (2022-03-18)

### [0.0.18](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.0.17...v0.0.18) (2022-03-09)

### [0.0.17](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.0.16...v0.0.17) (2022-03-09)

### [0.0.16](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.0.15...v0.0.16) (2022-03-09)

### [0.0.15](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.0.14...v0.0.15) (2022-02-17)

### [0.0.14](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.0.13...v0.0.14) (2022-02-14)

### [0.0.13](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.0.12...v0.0.13) (2022-01-20)

### [0.0.12](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.0.11...v0.0.12) (2022-01-18)

### [0.0.11](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.0.10...v0.0.11) (2022-01-18)

### [0.0.10](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.0.9...v0.0.10) (2022-01-13)


### Bug Fixes

* default api endpoint ([27495b6](https://github.com/firebolt-db/firebolt-node-sdk/commit/27495b688e4a6313fa76c56db323d0cd39f8c254))

### [0.0.9](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.0.8...v0.0.9) (2022-01-12)

### [0.0.8](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.0.7...v0.0.8) (2022-01-12)

### [0.0.7](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.0.6...v0.0.7) (2022-01-11)

### [0.0.6](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.0.5...v0.0.6) (2022-01-11)

### [0.0.5](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.0.4...v0.0.5) (2021-12-28)

### [0.0.4](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.0.3...v0.0.4) (2021-12-22)

### [0.0.3](https://github.com/firebolt-db/firebolt-node-sdk/compare/v0.0.2...v0.0.3) (2021-12-21)

### 0.0.2 (2021-12-21)
