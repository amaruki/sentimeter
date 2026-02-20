import { expect, test, describe } from "bun:test";
import { isMarketOpen } from "./market-hours.ts";

describe("Market Hours Utility", () => {
  // Mocking dates in 2024
  // Mar 25, 2024 is Monday
  // Mar 29, 2024 is Friday
  // Mar 30, 2024 is Saturday

  test("should be closed on weekends", () => {
    // Saturday, Mar 30, 2024, 10:00
    const saturday = new Date(2024, 2, 30, 10, 0);
    expect(isMarketOpen(saturday)).toBe(false);

    // Sunday, Mar 31, 2024, 10:00
    const sunday = new Date(2024, 2, 31, 10, 0);
    expect(isMarketOpen(sunday)).toBe(false);
  });

  test("should be open during Mon-Thu Session I", () => {
    // Monday, Mar 25, 2024, 10:00
    const mondayMorning = new Date(2024, 2, 25, 10, 0);
    expect(isMarketOpen(mondayMorning)).toBe(true);
  });

  test("should be closed during Mon-Thu lunch break", () => {
    // Monday, Mar 25, 2024, 12:30
    const mondayLunch = new Date(2024, 2, 25, 12, 30);
    expect(isMarketOpen(mondayLunch)).toBe(false);
  });

  test("should be open during Mon-Thu Session II", () => {
    // Monday, Mar 25, 2024, 14:00
    const mondayAfternoon = new Date(2024, 2, 25, 14, 0);
    expect(isMarketOpen(mondayAfternoon)).toBe(true);
  });

  test("should be open during Friday Session I", () => {
    // Friday, Mar 29, 2024, 10:00
    const fridayMorning = new Date(2024, 2, 29, 10, 0);
    expect(isMarketOpen(fridayMorning)).toBe(true);
  });

  test("should be closed during Friday lunch break (starts earlier)", () => {
    // Friday, Mar 29, 2024, 11:45
    const fridayLunch = new Date(2024, 2, 29, 11, 45);
    expect(isMarketOpen(fridayLunch)).toBe(false);
  });

  test("should be open during Friday Session II", () => {
    // Friday, Mar 29, 2024, 15:00
    const fridayAfternoon = new Date(2024, 2, 29, 15, 0);
    expect(isMarketOpen(fridayAfternoon)).toBe(true);
  });

  test("should be closed before market open", () => {
    // Monday, Mar 25, 2024, 08:30
    const early = new Date(2024, 2, 25, 8, 30);
    expect(isMarketOpen(early)).toBe(false);
  });

  test("should be closed after market close", () => {
    // Monday, Mar 25, 2024, 17:00
    const late = new Date(2024, 2, 25, 17, 0);
    expect(isMarketOpen(late)).toBe(false);
  });
});
