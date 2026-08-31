export type IdentityKind = 'visitor' | 'shared_partner' | 'member' | 'enterprise' | 'admin';
export type ReviewStatus = 'draft' | 'submitted' | 'under_review' | 'needs_info' | 'approved' | 'matched' | 'completed' | 'rejected' | 'cancelled';
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';
export type ShareType = 'care' | 'connection' | 'benefit' | 'job' | 'professional' | 'resource';

export interface RequestRecord {
  id: string;
  ownerType: 'person' | 'enterprise';
  category: string;
  title: string;
  status: ReviewStatus;
  updatedAt: string;
  nextStep: string;
  privacy: 'public_summary' | 'member_only' | 'restricted';
}

export interface ParticipationRecord {
  id: string;
  activity: string;
  status: VerificationStatus;
  participationType: string;
  verifiedAt?: string;
  footprintCreated: boolean;
}

export interface PartnerShareRecord {
  id: string;
  shareType: ShareType;
  title: string;
  status: ReviewStatus;
  publicResult: boolean;
}

export interface AuditEvent {
  id: string;
  action: string;
  actorRole: string;
  subjectType: string;
  subjectId: string;
  createdAt: string;
  note: string;
}
