import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
const sql=readFileSync('review-artifacts/sql/restaurant_apply_kitchen_reaction_v1.sql','utf8');
describe('unapplied reaction RPC proposal source safeguards (not DB execution)',()=>{
  it('restricts execution and holds exact mapping locks',()=>{
    expect(sql).toContain('security invoker');
    expect(sql).toContain("current_user <> 'service_role'");
    expect(sql).toContain('from public, anon, authenticated');
    expect(sql).toContain('pg_advisory_xact_lock');
    expect(sql).toContain('for update');
    expect(sql).toContain("v_notification.status is distinct from 'sent'");
    expect(sql).toContain('union all');
  });
  it('checks target order and notification creation under lock against explicit cutoff',()=>{
    expect(sql).toContain('p_live_after timestamptz');
    expect(sql).toContain('v_order.created_at < p_live_after');
    expect(sql).toContain('v_notification.created_at < p_live_after');
    expect(sql).toContain('not isfinite(p_live_after)');
  });
  it('casts status enum safely after transition allowlist',()=>{
    expect(sql).toContain('v_order.order_status::text is distinct from p_expected_status');
    expect(sql).toContain('o.order_status::text=p_expected_status');
    expect(sql.indexOf('p_target_status::public.order_status')).toBeGreaterThan(sql.indexOf("p_target_status='paid'"));
  });
});
