export const hasPaymentIdParam = (search: string): boolean => {
  try {
    return new URLSearchParams(search).has("paymentid");
  } catch {
    return false;
  }
};

export const getQueryParam = (
  search: string,
  key: "tour" | "tourdate" | "paymentid",
): string | null => {
  try {
    return new URLSearchParams(search).get(key);
  } catch {
    return null;
  }
};

export const buildUrlWithQueryParam = ({
  pathname,
  search,
  key,
  value,
}: {
  pathname: string;
  search: string;
  key: "tour" | "tourdate" | "paymentid";
  value: string | null;
}): string => {
  const params = new URLSearchParams(search);
  if (value) {
    params.set(key, String(value));
  } else {
    params.delete(key);
  }

  const next = params.toString();
  return next ? `${pathname}?${next}` : pathname;
};
