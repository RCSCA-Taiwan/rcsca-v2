export const donationHeaders:string[];
export const donationTemplate:string;
export type DonationImportRow={member_number:string;email:string;name:string;pledged:number|null;amount:number|null;received_on:string;reference:string;note:string};
export function parseDonationPaste(input:string):DonationImportRow[];
export function parseDonationNames(input:string,unitPrice:number):{name:string;units:number;pledged:number}[];
