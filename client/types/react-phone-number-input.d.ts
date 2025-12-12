declare module "react-phone-number-input" {
  import { ComponentType } from "react";

  export type Country = string;
  export type Value = string | undefined;

  export interface PhoneInputProps {
    value?: Value;
    onChange?: (value: Value) => void;
    defaultCountry?: Country;
    countries?: Country[];
    international?: boolean;
    withCountryCallingCode?: boolean;
    limitMaxLength?: boolean;
    error?: string | boolean;
    placeholder?: string;
    className?: string;
    labels?: Record<string, string>;
    [key: string]: any; // fallback for other library props
  }

  const PhoneInput: ComponentType<PhoneInputProps>;

  export function isValidPhoneNumber(value?: string): boolean;
  export function getCountries(): Country[];
  export function getCountryCallingCode(country: Country): string;

  export default PhoneInput;
}

declare module "react-phone-number-input/locale/en" {
  const labels: Record<string, string>;
  export default labels;
}

declare module "react-phone-number-input/style.css" {
  const content: string;
  export default content;
}
