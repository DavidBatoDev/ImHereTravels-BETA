import countries from "world-countries";
import React from "react";
import ReactCountryFlag from "react-country-flag";

// Extract country names from world-countries
// Sort alphabetically with commonly used ones at the top
export const getAllNationalities = (): { countryName: string; countryCode: string }[] => {
  const countryMap = new Map<string, string>();

  countries.forEach((country) => {
    const cca2 = country.cca2;
    
    // Invalid country codes for phone numbers
    const invalidPhoneCodes = new Set([
      "UM", // US Minor Outlying Islands
      "BV", // Bouvet Island
      "HM", // Heard Island and McDonald Islands
      "GS", // South Georgia and the South Sandwich Islands
      "TF", // French Southern Territories
      "AQ", // Antarctica
    ]);
    
    if (invalidPhoneCodes.has(cca2)) return;

    // Add country common name
    if (country.name?.common) {
      countryMap.set(country.name.common, cca2);
    }
  });

  // Convert to array and sort
  const allCountries = Array.from(countryMap.entries())
    .map(([countryName, code]) => ({ countryName, countryCode: code }))
    .sort((a, b) => a.countryName.localeCompare(b.countryName));

  // Put commonly searched countries at the top
  const priorityCountries = [
    "Philippines",
    "United States",
    "United Kingdom",
    "Canada",
    "Australia",
    "India",
    "China",
    "Japan",
    "South Korea",
    "Germany",
    "France",
    "Spain",
    "Italy",
    "Mexico",
    "Brazil",
  ];

  // Separate priority and remaining
  const priorityItems = priorityCountries
    .map((country) => allCountries.find((item) => item.countryName === country))
    .filter((item) => item !== undefined) as { countryName: string; countryCode: string }[];

  const remaining = allCountries.filter(
    (item) => !priorityCountries.includes(item.countryName)
  );

  return [...priorityItems, ...remaining];
};

// Get nationality options for the select component with flag icons
export const getNationalityOptions = () => {
  return getAllNationalities().map(({ countryName, countryCode }) => ({
    label: React.createElement(
      "span",
      { className: "inline-flex items-center gap-2" },
      React.createElement(ReactCountryFlag, {
        countryCode: countryCode,
        svg: true,
        "aria-label": countryName,
        style: {
          width: "1rem",
          height: "0.6rem",
          flexShrink: 0,
        },
      }),
      React.createElement("span", {}, countryName)
    ),
    value: countryName,
    searchValue: `${countryName} ${countryCode}`.toLowerCase(),
  }));
};

// Map country name to ISO country code (for phone dialing codes)
export const getNationalityCountryCode = (countryName: string): string | null => {
  // Direct country name to country code mapping
  const countryMap: { [key: string]: string } = {};
  
  // Invalid country codes for phone numbers (territories, disputed areas, etc.)
  const invalidPhoneCodes = new Set([
    "UM", // US Minor Outlying Islands
    "BV", // Bouvet Island
    "HM", // Heard Island and McDonald Islands
    "GS", // South Georgia and the South Sandwich Islands
    "TF", // French Southern Territories
    "AQ", // Antarctica
  ]);
  
  countries.forEach((country) => {
    const cca2 = country.cca2; // ISO 3166-1 alpha-2 code
    
    // Skip countries without valid phone codes
    if (invalidPhoneCodes.has(cca2)) return;
    
    // Map country common name to country code
    if (country.name?.common) {
      countryMap[country.name.common] = cca2;
    }
  });

  return countryMap[countryName] || null;
};
