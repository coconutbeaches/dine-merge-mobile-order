import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { reactionObservation } from './restaurantReactionObservation';
describe('redacted reaction observation', () => {
  it('ignores unrelated callbacks', () => expect(reactionObservation({messages:[{type:'text',text:{body:'private'}}]})).toBeNull());
  it('retains structure and safe enums without arbitrary keys or sensitive values', () => {
    const s=JSON.stringify(reactionObservation({channel_id:'SECRET-CHANNEL',event:{type:'messages',event:'patch'},messages_updates:[{id:'SECRET-ID',trigger:{source:'mobile',timestamp:1794985000,from:'66800000001',action:{type:'reaction',emoji:'✅',target:'SECRET-ID'}},after_update:{reactions:[{from:'66800000001',emoji:'✅'}]},text:{body:'PRIVATE'},'private-key':'PRIVATE'}]}));
    for (const secret of ['SECRET','66800000001','PRIVATE','private-key']) expect(s).not.toContain(secret);
    expect(s).toContain('mobile'); expect(s).toContain('epochSeconds'); expect(s).toContain('✅');
  });
  it('bounds samples and nesting', () => expect(JSON.stringify(reactionObservation({messages:Array(100).fill({type:'reaction',source:'sensitive-source',id:'private'})})).length).toBeLessThan(500));
});
