export type MemberImportRow={email:string;name:string;membership_type:string;member_since:string;referrer_email:string};
export const IMPORT_HEADERS:string[];
export const IMPORT_ERRORS:Record<string,string>;
export function parseMemberCSV(input:string):MemberImportRow[];
export function memberCSVTemplate():string;
export function importError(error:unknown):string;
