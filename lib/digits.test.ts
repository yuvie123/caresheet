import { describe, expect, it } from "vitest";
import { extractNumbers, numbersMatch } from "./digits";

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

describe("extractNumbers: fractions", () => {
  it("turns common fractions into decimals", () => {
    expect(extractNumbers("take 1/2 tablet")).toEqual(["0.5"]);
    expect(extractNumbers("1/4 tablet")).toEqual(["0.25"]);
    expect(extractNumbers("3/4 tsp")).toEqual(["0.75"]);
    expect(extractNumbers("take 1 1/2 tablets")).toEqual(["1.5"]);
    expect(extractNumbers("¼ tablet and 1¾ tsp")).toEqual(["0.25", "1.75"]);
  });
  it("leaves dates and other slashes alone", () => {
    expect(extractNumbers("10/12/2026")).toEqual(["10", "12", "2026"]);
    expect(extractNumbers("120/80 mmHg")).toEqual(["120", "80"]);
  });
});

describe("numbersMatch (two-sided translation guard)", () => {
  it("accepts the same numbers in any script", () => {
    expect(numbersMatch("more than 6 tablets in 24 hours", "24 ਘੰਟਿਆਂ ਵਿੱਚ ੬ ਤੋਂ ਵੱਧ ਗੋਲੀਆਂ ਨਹੀਂ")).toBe(true);
    expect(numbersMatch("Take with food", "ਭੋਜਨ ਨਾਲ ਲਓ")).toBe(true);
  });
  it("rejects a dropped number", () => {
    expect(numbersMatch("more than 6 tablets in 24 hours", "24 ਘੰਟਿਆਂ ਵਿੱਚ ਵੱਧ ਗੋਲੀਆਂ ਨਹੀਂ")).toBe(false);
  });
  it("rejects an added number", () => {
    expect(numbersMatch("Take with food", "ਦਿਨ ਵਿੱਚ ੨ ਵਾਰ ਲਓ")).toBe(false);
  });
});
