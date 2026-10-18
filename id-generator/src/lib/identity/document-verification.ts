export const documentTypes = [
  {
    value: "national_id",
    label: "National ID card",
    frameLabel: "ID card",
    aspectRatio: 1.586,
  },
  {
    value: "passport",
    label: "Passport",
    frameLabel: "Passport",
    aspectRatio: 1.42,
  },
  {
    value: "drivers_license",
    label: "Driver's license",
    frameLabel: "Driver's license",
    aspectRatio: 1.586,
  },
] as const;

export const residenceCountries = [
  { value: "KE", label: "Kenya" },
  { value: "UG", label: "Uganda" },
  { value: "TZ", label: "Tanzania" },
  { value: "RW", label: "Rwanda" },
  { value: "NG", label: "Nigeria" },
  { value: "GH", label: "Ghana" },
  { value: "ZA", label: "South Africa" },
  { value: "ET", label: "Ethiopia" },
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "GB", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "AE", label: "United Arab Emirates" },
  { value: "IN", label: "India" },
  { value: "OTHER", label: "Other country" },
] as const;

export type DocumentType = (typeof documentTypes)[number]["value"];

export function getDocumentType(value: string) {
  return documentTypes.find((documentType) => documentType.value === value);
}
