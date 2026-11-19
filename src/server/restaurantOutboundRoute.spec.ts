import { describe,it,expect,vi,beforeEach,afterEach } from 'vitest';
vi.mock('server-only',()=>({}));
const {client}=vi.hoisted(()=>({client:vi.fn()}));
vi.mock('@/lib/supabase-server',()=>({createServiceRoleClient:client}));
import {restaurantOutboundRoute} from './restaurantOutboundRoute';
const secret='synthetic-webhook-secret-32-characters';
beforeEach(()=>{vi.stubEnv('RESTAURANT_OUTBOUND_ENABLED','true');vi.stubEnv('RESTAURANT_OUTBOUND_LIVE_AFTER','2026-11-18T04:00:00Z');vi.stubEnv('RESTAURANT_WHAPI_CHANNEL_ID','TEST');vi.stubEnv('RESTAURANT_WHAPI_PHONE','66800000001');vi.stubEnv('RESTAURANT_KITCHEN_GROUP_ID','123@g.us');vi.stubEnv('RESTAURANT_WHAPI_TOKEN','synthetic');vi.stubEnv('RESTAURANT_KITCHEN_WEBHOOK_SECRET',secret);client.mockReset();});
afterEach(()=>vi.unstubAllEnvs());
const request=(body:string,key=secret)=>new Request('https://example.test/api/restaurant/order-created',{method:'POST',headers:{'X-Restaurant-Kitchen-Secret':key},body});
describe('outbound route boundary',()=>{
 it('rejects unauthenticated before DB client',async()=>{expect((await restaurantOutboundRoute(request('{"order_id":42}','bad'),'kitchen')).status).toBe(401);expect(client).not.toHaveBeenCalled();});
 it('fails closed default disabled',async()=>{vi.stubEnv('RESTAURANT_OUTBOUND_ENABLED','false');expect((await restaurantOutboundRoute(request('{"order_id":42}'),'kitchen')).status).toBe(503);expect(client).not.toHaveBeenCalled();});
 it('bounds streamed body',async()=>{expect((await restaurantOutboundRoute(request('x'.repeat(1025)),'kitchen')).status).toBe(413);expect(client).not.toHaveBeenCalled();});
 it.each(['null','{}','{"order_id":"42"}','{"order_id":0}','{"order_id":-1}','{'])('rejects invalid id/json %s',async body=>{expect((await restaurantOutboundRoute(request(body),'kitchen')).status).toBe(400);expect(client).not.toHaveBeenCalled();});
 it('requires event_id on reaction route',async()=>{expect((await restaurantOutboundRoute(request('{"order_id":42}'),'reaction')).status).toBe(400);expect(client).not.toHaveBeenCalled();});
});
