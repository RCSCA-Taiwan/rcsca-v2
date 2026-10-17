export type MemberBirthday = {name: string; month: number; day: number; membership_type: 'annual' | 'lifetime'};
export function memberBirthdayCSV(rows: readonly MemberBirthday[], month: number): string;
