export type LocationPickerResult = {
  address: string;
  latitude: number;
  longitude: number;
  unitFloor?: string;
  contactName?: string;
  contactPhone?: string;
  field?: string;
};

// Module-level result — set by the picker screen, read by the caller on focus-return
let result: LocationPickerResult | null = null;

export const setLocationPickerResult = (r: LocationPickerResult | null) => { result = r; };
export const getLocationPickerResult = () => result;
export const clearLocationPickerResult = () => { result = null; };
