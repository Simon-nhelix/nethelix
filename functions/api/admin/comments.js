// 관리 API: Authorization: Bearer <ADMIN_TOKEN>
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

function authorized(request, env) {
  if (!env.ADMIN_TOKEN) return false;
  const h = request.headers.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (token.length !== env.ADMIN_TOKEN.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ env.ADMIN_TOKEN.charCodeAt(i);
  return diff === 0;
}

export async function onRequestGet({ request, env }) {
  if (!env.ADMIN_TOKEN) return json({ error: 'ADMIN_TOKEN not set' }, 503);
  if (!authorized(request, env)) return json({ error: 'unauthorized' }, 401);
  const status = new URL(request.url).searchParams.get('status') || 'pending';
  const where = status === 'all' ? '' : 'WHERE status = ?';
  const stmt = env.DB.prepare(`SELECT id, page, name, body, status, created_at FROM comments ${where} ORDER BY created_at DESC LIMIT 500`);
  const { results } = await (status === 'all' ? stmt : stmt.bind(status)).all();
  return json({ comments: results });
}

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_TOKEN) return json({ error: 'ADMIN_TOKEN not set' }, 503);
  if (!authorized(request, env)) return json({ error: 'unauthorized' }, 401);
  let data;
  try { data = await request.json(); } catch { return json({ error: 'bad json' }, 400); }
  const id = Number(data.id);
  const action = String(data.action || '');
  if (!Number.isInteger(id) || id <= 0) return json({ error: 'bad id' }, 400);
  if (action === 'approve' || action === 'reject') {
    const st = action === 'approve' ? 'approved' : 'rejected';
    await env.DB.prepare('UPDATE comments SET status = ? WHERE id = ?').bind(st, id).run();
  } else if (action === 'delete') {
    await env.DB.prepare('DELETE FROM comments WHERE id = ?').bind(id).run();
  } else {
    return json({ error: 'bad action' }, 400);
  }
  return json({ ok: true });
}
