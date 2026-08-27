// Local-only browser fixture. No credentials or provider calls. Start the real
// Next production server at 127.0.0.1:3109 first, then open the fixture at :3108.
import { createServer } from 'node:http';

const session = {
  guest_user_id: '11111111-1111-4111-8111-111111111111',
  guest_stay_id: 'walkin-11111111-1111-4111-8111-111111111111',
  guest_first_name: 'KUNG STAFF',
};
const calls = [];
const bootstrap = `<script>localStorage.setItem('guest_user_id',${JSON.stringify(session.guest_user_id)});localStorage.setItem('guest_stay_id',${JSON.stringify(session.guest_stay_id)});localStorage.setItem('guest_first_name','Kung');localStorage.setItem('table_number_pending','Take Away');</script>`;

createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1:3108');
  const json = (value, status = 200) => {
    response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify(value));
  };
  if (url.pathname === '/fixture-calls') return json(calls);
  if (url.pathname.startsWith('/api/')) {
    calls.push(url.pathname);
    if (url.pathname === '/api/restaurant/handshake/status') return json({
      status: 'completed', table_number: 'Take Away', first_name: 'KUNG STAFF',
      match_kind: 'walkin', upgrade_required: true,
    });
    if (url.pathname === '/api/restaurant/handshake/upgrade') return json({ status: 'bound', session });
    // A registration or order-delivery request is a test failure, never forwarded.
    return json({ error: 'Unexpected API call in browser fixture' }, 409);
  }
  try {
    const headers = { accept: request.headers.accept || '*/*' };
    for (const name of ['rsc', 'next-router-state-tree', 'next-router-prefetch', 'next-url']) {
      if (request.headers[name]) headers[name] = request.headers[name];
    }
    const upstream = await fetch(`http://127.0.0.1:3109${url.pathname}${url.search}`, {
      headers,
    });
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    response.writeHead(upstream.status, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
    if (contentType.includes('text/html')) {
      response.end((await upstream.text()).replace('<head>', `<head>${bootstrap}`));
    } else response.end(Buffer.from(await upstream.arrayBuffer()));
  } catch {
    response.writeHead(502);
    response.end('Start the local Next production server on port 3109.');
  }
}).listen(3108, '127.0.0.1', () => console.log('Synthetic upgrade callback fixture: http://127.0.0.1:3108'));
