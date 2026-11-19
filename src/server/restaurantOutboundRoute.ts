import 'server-only';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { authenticate, configured, outboundConfig, createOutboundStore, createWhapiProvider, deliverKitchen, reconcileReactions } from './restaurantOutbound';
export async function restaurantOutboundRoute(request: Request, kind: 'kitchen' | 'reaction'): Promise<Response> {
    const config = outboundConfig(process.env);
    if (!configured(config))
        return Response.json({ code: 'configuration_closed' }, { status: 503 });
    if (!authenticate(request.headers.get('X-Restaurant-Kitchen-Secret'), config.secret))
        return Response.json({ code: 'unauthorized' }, { status: 401 });
    if (Number(request.headers.get('content-length') ?? 0) > 1024)
        return Response.json({ code: 'body_too_large' }, { status: 413 });
    let data: Record<string, unknown>;
    try {
        const reader = request.body?.getReader();
        let bytes = 0;
        const chunks: Uint8Array[] = [];
        if (reader) {
            while (true) {
                const r = await reader.read();
                if (r.done)
                    break;
                bytes += r.value.byteLength;
                if (bytes > 1024) {
                    await reader.cancel();
                    return Response.json({ code: 'body_too_large' }, { status: 413 });
                }
                chunks.push(r.value);
            }
        }
        data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    }
    catch {
        return Response.json({ code: 'invalid_json' }, { status: 400 });
    }
    const id = data?.[kind === 'kitchen' ? 'order_id' : 'event_id'];
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0)
        return Response.json({ code: 'invalid_id' }, { status: 400 });
    const client = createServiceRoleClient();
    if (!client)
        return Response.json({ code: 'database_unavailable' }, { status: 503 });
    const result = await (kind === 'kitchen' ? deliverKitchen : reconcileReactions)(createOutboundStore(client), createWhapiProvider(), config, id);
    // Never include payloads, identities, secrets or provider responses in logs.
    console.info('[restaurant-outbound]', { kind, status: result.status, code: result.code ?? null });
    return Response.json(result, { status: result.status === 'uncertain' ? 503 : 200 });
}
