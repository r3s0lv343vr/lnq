import { beforeEach, describe, expect, it } from 'vitest';
import { DEMO_ACCOUNT, DemoStore } from './demo-store';

describe('DemoStore auth', () => {
  let store: DemoStore;

  beforeEach(() => {
    store = new DemoStore();
    // Fresh in-memory state (no window/localStorage in node tests)
    store.signOut();
  });

  it('signs in with known demo credentials without prior signup', () => {
    const profile = store.signIn(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password);
    expect(profile.email).toBe(DEMO_ACCOUNT.email);
    expect(profile.role).toBe('admin');
    expect(store.getCurrentUser()?.email).toBe(DEMO_ACCOUNT.email);
  });

  it('ensureDemoAccount recovers a stale demo user without passwordHash', () => {
    store.ensureSeedData();
    const users = (store as unknown as { state: { users: Record<string, { passwordHash?: string }> } })
      .state.users;
    const demo = Object.values(users)[0];
    expect(demo).toBeTruthy();
    delete demo.passwordHash;

    const profile = store.ensureDemoAccount();
    expect(profile.email).toBe(DEMO_ACCOUNT.email);
    expect(store.signIn(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password).uid).toBe(profile.uid);
  });

  it('rejects wrong passwords for non-demo accounts', () => {
    store.signUp({
      email: 'peer@example.com',
      password: 'correct-horse',
      displayName: 'Peer',
    });
    store.signOut();
    expect(() => store.signIn('peer@example.com', 'wrong')).toThrow('Invalid email or password.');
  });
});
