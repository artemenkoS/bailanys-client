import type { Profile } from './auth';

export type ContactRelation = 'contact' | 'incoming' | 'outgoing' | 'none';

export interface ContactSearchResult extends Profile {
  relation: ContactRelation;
  request_id?: string | null;
}

export interface ContactRequestEntry {
  id: string;
  status: 'pending' | 'accepted' | 'declined' | 'canceled';
  created_at: string | null;
  user: Profile;
}

export interface ContactRequestsResponse {
  incoming: ContactRequestEntry[];
  outgoing: ContactRequestEntry[];
}
