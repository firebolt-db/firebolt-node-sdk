import { getInnerType } from "../../src/statement/dataTypes";
import { getStructTypes } from "../../src/statement/dataTypes";

describe("getInnerType function", () => {
  it("should return the inner type for a nullable type", () => {
    const type = "nullable(int)";
    const result = getInnerType(type);
    expect(result).toBe("int");
  });

  it("should return the inner type for an array type", () => {
    const type = "array(int)";
    const result = getInnerType(type);
    expect(result).toBe("int");
  });

  it("should return the inner type for a nested nullable type", () => {
    const type = "nullable(nullable(int))";
    const result = getInnerType(type);
    expect(result).toBe("int");
  });

  it("should return the original type if no complex type is found", () => {
    const type = "int";
    const result = getInnerType(type);
    expect(result).toBe("int");
  });
});

describe("getStructTypes function", () => {
  it("should return the correct types for a simple struct", () => {
    const type = "struct(a int, b text)";
    const result = getStructTypes(type);
    expect(result).toEqual({ a: "int", b: "text" });
  });

  it("should return the correct types for a nested struct", () => {
    const type = "struct(a int, b struct(c int, d text))";
    const result = getStructTypes(type);
    expect(result).toEqual({ a: "int", b: "struct(c int, d text)" });
  });

  it("should return an empty object for a non-struct type", () => {
    const type = "int";
    const result = getStructTypes(type);
    expect(result).toEqual({});
  });

  it("should handle structs with nullable types", () => {
    const type = "struct(a int null, b text null)";
    const result = getStructTypes(type);
    expect(result).toEqual({ a: "int null", b: "text null" });
  });

  it("should handle structs with array types", () => {
    const type = "struct(a array(int), b array(text))";
    const result = getStructTypes(type);
    expect(result).toEqual({ a: "array(int)", b: "array(text)" });
  });

  it("should handle structs with nested array types", () => {
    const type = "struct(a array(int), b array(array(text)))";
    const result = getStructTypes(type);
    expect(result).toEqual({ a: "array(int)", b: "array(array(text))" });
  });

  it("should not fail on malformed struct types", () => {
    const type = "struct(a int, b text";
    const result = getStructTypes(type);
    // This allows the outer function to continue processing the type
    // as text
    expect(result).toEqual({});
  });

  it("should handle structs with mixed case columns", () => {
    const type = "struct(mIxEdCaSe int, MiXeDcAsE text)";
    const result = getStructTypes(type);
    expect(result).toEqual({ mIxEdCaSe: "int", MiXeDcAsE: "text" });
  });

  it("should handle structs with spaces in column names", () => {
    const type = "struct(`column name` int, `column name 2` text)";
    const result = getStructTypes(type);
    expect(result).toEqual({ "column name": "int", "column name 2": "text" });
  });
});
