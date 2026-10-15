export type PointsWallet = {
  balance: number;
  reserved_points?:number;
  ledger_balance?:number;
  status: 'active_cycle' | 'admission_pending' | 'before_membership';
  member_since: string | null;
  cycle_start: string | null;
  expires_at: string | null;
  expires_on: string | null;
  days_left: number | null;
};
