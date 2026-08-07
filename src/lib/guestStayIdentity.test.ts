import { describe, expect, it } from 'vitest';
import { normalizeGuestFirstName, resolveUniqueActiveStay } from './guestStayIdentity';

describe('guest stay identity resolution', () => {
  it('normalizes diacritics and punctuation', () => {
    expect(normalizeGuestFirstName(' Élodie ')).toBe('elodie');
  });

  it('resolves one exact first-name match among active stays', () => {
    expect(
      resolveUniqueActiveStay(
        'Lode',
        [{ stay_id: 'BH_VANSTEEN', observed_first_name: 'Lode' }],
        [{ stay_id: 'BH_VANSTEEN', check_in_date: '2026-08-01', check_out_date: '2026-08-10' }],
        '2026-08-07',
      ),
    ).toBe('BH_VANSTEEN');
  });

  it('does not resolve a name shared by two active stays', () => {
    expect(
      resolveUniqueActiveStay(
        'Alex',
        [
          { stay_id: 'STAY_A', observed_first_name: 'Alex' },
          { stay_id: 'STAY_B', observed_first_name: 'Alex' },
        ],
        [
          { stay_id: 'STAY_A', check_in_date: '2026-08-01', check_out_date: '2026-08-10' },
          { stay_id: 'STAY_B', check_in_date: '2026-08-05', check_out_date: '2026-08-12' },
        ],
        '2026-08-07',
      ),
    ).toBeNull();
  });

  it('does not resolve an inactive or fuzzy-only candidate', () => {
    expect(
      resolveUniqueActiveStay(
        'Jon',
        [{ stay_id: 'OLD_STAY', observed_first_name: 'John' }],
        [{ stay_id: 'OLD_STAY', check_in_date: '2026-07-01', check_out_date: '2026-07-05' }],
        '2026-08-07',
      ),
    ).toBeNull();
  });
});
