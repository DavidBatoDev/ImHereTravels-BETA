export const scheduleGuestsMountHeightSync = ({
  setGuestsMounted,
  getContentHeight,
  setGuestsHeight,
}: {
  setGuestsMounted: (value: boolean) => void;
  getContentHeight: () => number;
  setGuestsHeight: (value: string) => void;
}): void => {
  setGuestsMounted(true);

  setTimeout(() => {
    const contentHeight = getContentHeight();
    if (contentHeight > 0) {
      setGuestsHeight(`${contentHeight}px`);
    }
  }, 0);
};
