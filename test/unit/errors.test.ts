import { CompositeError } from "../../src/common/errors";

describe("CompositeError", () => {
  it("should create a CompositeError instance with an empty errors array", () => {
    const compositeError = new CompositeError([]);
    try {
      throw compositeError;
    } catch (e) {
      expect(e).toBeInstanceOf(CompositeError);
      expect(e.message).toBe("");
    }
  });
  const testCases = [
    {
      name: "should create a CompositeError with missing code",
      errors: [
        {
          name: "Error 1",
          description: "This is error 1",
          severity: "high",
          source: "User Error"
        }
      ],
      expectedMessage: "high: Error 1 User Error - This is error 1"
    },
    {
      name: "should create a CompositeError with missing name",
      errors: [
        {
          code: "ERR1",
          description: "This is error 1",
          severity: "medium"
        }
      ],
      expectedMessage: "medium: (ERR1) - This is error 1"
    },
    {
      name: "should create a CompositeError with missing description",
      errors: [
        {
          code: "ERR1",
          name: "Error 1",
          severity: "low"
        }
      ],
      expectedMessage: "low: Error 1 (ERR1)"
    },
    {
      name: "should create a CompositeError with all properties",
      errors: [
        {
          code: "ERR1",
          name: "Error 1",
          description: "This is error 1",
          severity: "high",
          source: "User Error",
          resolution: "Check the backend code",
          helpLink: "https://example.com/error1",
          location: {
            failingLine: 10,
            startOffset: 20,
            endOffset: 30
          }
        },
        {
          code: "ERR2",
          name: "Error 2",
          description: "This is error 2",
          severity: "medium",
          source: "Firebolt error",
          resolution: "Check the frontend code",
          helpLink: "https://example.com/error2",
          location: {
            failingLine: 20,
            startOffset: 40,
            endOffset: 50
          }
        },
        {
          code: "ERR3",
          name: "Error 3",
          description: "This is error 3",
          severity: "low",
          source: "Some other error source",
          resolution: "Check the database code",
          helpLink: "https://example.com/error3",
          location: {
            failingLine: 30,
            startOffset: 60,
            endOffset: 70
          }
        }
      ],
      expectedMessage:
        'high: Error 1 (ERR1) User Error - This is error 1, resolution: Check the backend code at {"failingLine":10,"startOffset":20,"endOffset":30}, see https://example.com/error1,\n' +
        'medium: Error 2 (ERR2) Firebolt error - This is error 2, resolution: Check the frontend code at {"failingLine":20,"startOffset":40,"endOffset":50}, see https://example.com/error2,\n' +
        'low: Error 3 (ERR3) Some other error source - This is error 3, resolution: Check the database code at {"failingLine":30,"startOffset":60,"endOffset":70}, see https://example.com/error3'
    }
  ];

  testCases.forEach(testCase => {
    it(testCase.name, () => {
      const compositeError = new CompositeError(testCase.errors);
      try {
        throw compositeError;
      } catch (e) {
        expect(e).toBeInstanceOf(CompositeError);
        expect(e.message).toContain(testCase.expectedMessage);
      }
    });
  });
});
