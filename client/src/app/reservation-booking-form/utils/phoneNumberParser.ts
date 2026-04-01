export type ParsedWhatsAppNumber = {
  matched: boolean;
  country?: string;
  localNumber: string;
};

export const parseWhatsAppInternationalNumber = ({
  fullNumber,
  countries,
  getCallingCode,
  fallbackMode = "keep-original",
}: {
  fullNumber?: string | null;
  countries: string[];
  getCallingCode: (country: string) => string;
  fallbackMode?: "keep-original" | "strip-plus";
}): ParsedWhatsAppNumber => {
  const value = fullNumber || "";
  if (!value.startsWith("+")) {
    return {
      matched: false,
      localNumber: value,
    };
  }

  for (const country of countries) {
    try {
      const callingCode = getCallingCode(country);
      if (value.startsWith(`+${callingCode}`)) {
        return {
          matched: true,
          country,
          localNumber: value.substring(callingCode.length + 1),
        };
      }
    } catch {
      // Ignore unknown/invalid country entries.
    }
  }

  return {
    matched: false,
    localNumber:
      fallbackMode === "strip-plus" ? value.replace(/^\+/, "") : value,
  };
};
