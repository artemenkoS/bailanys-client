import type { Session } from '../../../types/auth';

const RECOVERY_SESSION_KEY = 'recovery-session';

export const saveRecoverySession = (session: Session) => {
  try {
    sessionStorage.setItem(RECOVERY_SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Failed to store recovery session', error);
  }
};

export const loadRecoverySession = (): Session | null => {
  try {
    const raw = sessionStorage.getItem(RECOVERY_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch (error) {
    console.error('Failed to load recovery session', error);
    return null;
  }
};

export const clearRecoverySession = () => {
  try {
    sessionStorage.removeItem(RECOVERY_SESSION_KEY);
  } catch (error) {
    console.error('Failed to clear recovery session', error);
  }
};
