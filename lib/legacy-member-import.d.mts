export type LegacyRow={name:string;membership_type:string;member_since:string;membership_year:string;email:string;phone:string;identity:string;birth_date:string;referrer_text:string};
export const LEGACY_HEADERS:string[];
export const LEGACY_ERRORS:Record<string,string>;
export function legacyCSVTemplate():string;
export function parseLegacyCSV(input:string):LegacyRow[];
