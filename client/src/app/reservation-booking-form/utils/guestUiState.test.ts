import { afterEach, describe, expect, it, vi } from "vitest";
import { scheduleGuestsMountHeightSync } from "./guestUiState";

afterEach(() => {
  vi.useRealTimers();
});

describe("guestUiState", () => {
  it("mounts guests and applies height when content is measurable", () => {
    vi.useFakeTimers();

    const setGuestsMounted = vi.fn();
    const setGuestsHeight = vi.fn();

    scheduleGuestsMountHeightSync({
      setGuestsMounted,
      getContentHeight: () => 240,
      setGuestsHeight,
    });

    expect(setGuestsMounted).toHaveBeenCalledWith(true);
    expect(setGuestsHeight).not.toHaveBeenCalled();

    vi.runAllTimers();
    expect(setGuestsHeight).toHaveBeenCalledWith("240px");
  });

  it("mounts guests but skips height update when content height is zero", () => {
    vi.useFakeTimers();

    const setGuestsMounted = vi.fn();
    const setGuestsHeight = vi.fn();

    scheduleGuestsMountHeightSync({
      setGuestsMounted,
      getContentHeight: () => 0,
      setGuestsHeight,
    });

    vi.runAllTimers();

    expect(setGuestsMounted).toHaveBeenCalledWith(true);
    expect(setGuestsHeight).not.toHaveBeenCalled();
  });
});
