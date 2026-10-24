import { describe, expect, it } from "vitest";
import { extractNumbers } from "./digits";

describe("extractNumbers: separators", () => {
  it("reads thousands separators as one number", () => {
    expect(extractNumbers("1,000 mg")).toEqual(["1000"]);
    expect(extractNumbers("take 5,000 IU daily")).toEqual(["5000"]);
    expect(extractNumbers("1,000,000 units")).toEqual(["1000000"]);
  });
  it("reads European decimal commas", () => {
    expect(extractNumbers("2,5 mg")).toEqual(["2.5"]);
    expect(extractNumbers("0,125 mg")).toEqual(["0.125"]);
    expect(extractNumbers("0,5 tablet")).toEqual(["0.5"]);
  });
  it("keeps normal decimals and separate numbers", () => {
    expect(extractNumbers("1,000.5 mg")).toEqual(["1000.5"]);
    expect(extractNumbers("take 1, 2 or 3 tablets")).toEqual(["1", "2", "3"]);
    expect(extractNumbers("12.5 mg")).toEqual(["12.5"]);
  });
});
