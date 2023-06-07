import { JSONParser } from "./parser";

const body1 = `
{
  "query":
  {
    "query_id": "50cd4109-02de-4e19-b995-5e71a5f16fb7"
  },
  "meta":
  [
    {
    "name": "engine_name",
    "type": "text"
    }
  ],

  "data":
  [
    ["peacekeeper_ns_2023_01_20_08_06_45_153_create_engine_test"],
    ["Aymeric_test_2_Analytics"],
    ["integration_testing_windowslatest_37_1675858870"],
    ["test_4"],
    ["peacekeeper_ns_2023_01_21_11_03_09_210_CREATE_ENGINE_TEST_2_3"]
  ],

  "rows": 5,

  "rows_before_limit_at_least": 233,

  "statistics":
  {
  "elapsed": 0.42408089,
  "rows_read": 233,
  "bytes_read": 30680,
  "time_before_execution": 0.000588018,
  "time_to_execute": 0.423289816,
  "scanned_bytes_cache": 0,
  "scanned_bytes_storage": 0
  }
}
`;
const body2 = `
{
"query":
{
"query_id": "50cd4109-02de-4e19-b995-5e71a5f16fb9"
},
"meta":
[
{
"name": "engine_name",
"type": "text"
}
],

"data":
[
["peacekeeper_ns_2023_01_20_08_06_45_153_create_engine_test"],
["Aymeric_test_2_Analytics"],
["integration_testing_windowslatest_37_1675858870"]
],

"rows": 3,

"rows_before_limit_at_least": 233,

"statistics":
{
"elapsed": 0.42408089,
"rows_read": 233,
"bytes_read": 30680,
"time_before_execution": 0.000588018,
"time_to_execute": 0.423289816,
"scanned_bytes_cache": 0,
"scanned_bytes_storage": 0
}
}
`;
describe("parser", () => {
  it("handles single reponse", () => {
    const parser = new JSONParser({});
    parser.processBody(body1);
    expect(parser.results[0].rows).toHaveLength(5);
    expect(parser.results[0].columns).toHaveLength(1);
  });
  it("handles multi response", () => {
    const parser = new JSONParser({});
    parser.processBody(`
${body1}
${body2}`);
    expect(parser.results[0].rows).toHaveLength(5);
    expect(parser.results[1].rows).toHaveLength(3);
    expect(parser.results[1].columns).toHaveLength(1);
  });
  it("handles empty meta and data", () => {
    const parser = new JSONParser({});
    parser.processBody(`
{
  "statistics":
{
    "elapsed": 0.0, "rows_read": 0, "bytes_read": 0
}
}`);
    expect(parser.results[0].rows).toHaveLength(0);
    expect(parser.results[0].columns).toHaveLength(0);
  });
  it("fails on empty body", () => {
    try {
      const parser = new JSONParser({});
      parser.processBody(`{}`);
      expect(parser.results[0].rows).toHaveLength(0);
      expect(true).toEqual(false);
    } catch (error) {
      expect(true).toEqual(true);
    }
  });
});
