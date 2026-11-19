import {describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {webcrypto} from 'node:crypto';
import ts from 'typescript';
import {finalizeGuestDelivery,freshDeliveryOrder,verifyRestaurantProvider} from '../../supabase/functions/restaurant-auto-delivery/finalizeGuestDelivery';
const source=readFileSync(process.cwd()+'/supabase/functions/restaurant-auto-delivery/index.ts','utf8');
function setup({old=false,rpcOk=true,configured=true}={}) {
 const now=Date.now(),time=(delta:number)=>new Date(now+delta).toISOString();
 const order={id:42,created_at:time(old?-86400000:-60000),order_status:'new',total_amount:30,order_items:[{name:'Rice',quantity:1}],table_number:'2',guest_user_id:'synthetic-guest-id',stay_id:'SYNTHETIC',guest_first_name:'Test',customer_name:'Test',kitchen_whapi_message_id:null,restaurant_auto_delivery_status:null};
 const hs={id:'hs',table_number:'2',first_name:'Test',status:'completed',match_kind:'hotel',whatsapp_chat_id:'66800000002@s.whatsapp.net',matched_stay_id:'SYNTHETIC',provider_channel_id:'TEST-CHANNEL',completed_at:time(-120000),bound_guest_user_id:'synthetic-guest-id',bound_guest_stay_id:'SYNTHETIC'};
 const responses=[{data:order,error:null},{data:hs,error:null},{data:[{id:42}],error:null},{data:[],error:null}];
 const updates:Record<string,unknown>[]=[];
 const chains:{method:string,args:unknown[]}[][]=[];
 const client={from:vi.fn(()=>{const response=responses.shift();const trace:{method:string,args:unknown[]}[]=[];chains.push(trace);const chain:Record<string,unknown>={};for(const method of ['select','update','eq','is','maybeSingle'])chain[method]=(...args:unknown[])=>{trace.push({method,args});if(method==='update')updates.push(args[0] as Record<string,unknown>);return chain;};chain.then=(resolve:(r:unknown)=>unknown)=>Promise.resolve(response).then(resolve);return chain;}),rpc:vi.fn().mockResolvedValue(rpcOk?{data:'delivery_sent',error:null}:{data:null,error:{message:'unconfirmed'}})};
 const fetch=vi.fn().mockResolvedValueOnce(Response.json({status:{text:'AUTH'},user:{id:'66800000001'},channel_id:'TEST-CHANNEL'})).mockResolvedValueOnce(Response.json({message:{id:'synthetic-provider-message'}}));
 let handler:(request:Request)=>Promise<Response>;
 const env:Record<string,string>={SUPABASE_URL:'https://synthetic.invalid',SUPABASE_SECRET_KEYS:JSON.stringify({edge_admin_2026_06:'synthetic'}),RESTAURANT_WHAPI_TOKEN:'synthetic',RESTAURANT_WHAPI_CHANNEL_ID:'TEST-CHANNEL',RESTAURANT_WHAPI_PHONE:'66800000001',RESTAURANT_OUTBOUND_LIVE_AFTER:configured?time(-3600000):''};
 const js=ts.transpileModule(source.replace(/^import .*;\n/gm,''),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 runInNewContext(js,{serve:(h:typeof handler)=>handler=h,createClient:()=>client,finalizeGuestDelivery,freshDeliveryOrder,verifyRestaurantProvider:(token:string,channel:string,phone:string)=>verifyRestaurantProvider(token,channel,phone,fetch),Deno:{env:{get:(key:string)=>env[key]}},fetch,Response,Request,AbortController,TextEncoder,crypto:webcrypto,console:{log:()=>{},error:()=>{}},setTimeout,clearTimeout});
 return {client,fetch,updates,chains,run:()=>handler(new Request('https://synthetic.invalid',{method:'POST',body:JSON.stringify({order_id:42,handshake_ref:'ABCDE-FGHJK'})}))};
}
describe('deployed-v4 Edge entrypoint migration with only injected mocks',()=>{
 it.each([{old:true},{configured:false}])('never mutates or sends outside migration window %j',async options=>{const s=setup(options);const r=await s.run();expect((await r.json()).code).toBe('order_outside_migration_window');expect(s.updates).toHaveLength(0);expect(s.fetch).not.toHaveBeenCalled();expect(s.client.rpc).not.toHaveBeenCalled();});
 it('preserves direct delivery while finalizing only through coordinated RPC',async()=>{const s=setup();const r=await s.run();expect((await r.json()).status).toBe('sent');expect(s.fetch).toHaveBeenCalledTimes(2);expect(s.client.rpc).toHaveBeenCalledWith('restaurant_finalize_guest_delivery_v1',expect.objectContaining({p_order_id:42,p_message_id:'synthetic-provider-message',p_channel_id:'TEST-CHANNEL',p_chat_id:'66800000002@s.whatsapp.net'}));expect(s.updates).toHaveLength(1);expect(s.updates[0]).not.toHaveProperty('kitchen_whapi_message_id');});
 it('uncertain finalization fences update to pending exact attempt and never resends',async()=>{const s=setup({rpcOk:false});const r=await s.run();expect((await r.json()).status).toBe('uncertain');expect(s.fetch).toHaveBeenCalledTimes(2);expect(s.updates).toHaveLength(2);expect(s.updates[1]).toEqual(expect.objectContaining({restaurant_auto_delivery_status:'uncertain'}));expect(s.chains.at(-1)).toEqual(expect.arrayContaining([{method:'eq',args:['restaurant_auto_delivery_status','pending']},{method:'eq',args:['restaurant_auto_delivery_attempted_at',s.updates[0].restaurant_auto_delivery_attempted_at]}]));});
});
