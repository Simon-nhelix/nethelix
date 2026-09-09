// 공개 API: 댓글/방명록 읽기(승인된 것만) + 쓰기(대기 상태로 저장)
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

const PAGE_RE = /^[a-z0-9\-\/_.]{1,200}$/;

async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const page = url.searchParams.get('page') || '';
  if (!PAGE_RE.test(page)) return json({ error: 'bad page' }, 400);
  if (!env.DB) return json({ error: 'db not bound' }, 503);
  const { results } = await env.DB.prepare(
    "SELECT id, name, body, created_at FROM comments WHERE page = ? AND status = 'approved' ORDER BY created_at DESC LIMIT 200"
  ).bind(page).all();
  return json({ comments: results });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'db not bound' }, 503);
  let data;
  try { data = await request.json(); } catch { return json({ error: 'bad json' }, 400); }

  const page = String(data.page || '');
  const name = String(data.name || '').trim().replace(/\s+/g, ' ');
  const body = String(data.body || '').trim();
  if (!PAGE_RE.test(page)) return json({ error: 'bad page' }, 400);
  if (name.length < 1 || name.length > 30) return json({ error: '닉네임은 1~30자로 적어주세요.' }, 400);
  if (body.length < 1 || body.length > 1000) return json({ error: '내용은 1~1000자로 적어주세요.' }, 400);
  if (/https?:\/\/\S+.*https?:\/\/\S+.*https?:\/\/\S+/is.test(body)) return json({ error: '링크가 너무 많아요.' }, 400);

  // Turnstile 검증 (비밀키가 설정된 경우에만)
  if (env.TURNSTILE_SECRET) {
    const token = String(data.turnstileToken || '');
    if (!token) return json({ error: '사람인지 확인이 필요해요.' }, 400);
    const ip = request.headers.get('CF-Connecting-IP') || '';
    const form = new FormData();
    form.append('secret', env.TURNSTILE_SECRET);
    form.append('response', token);
    if (ip) form.append('remoteip', ip);
    const vr = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
    const v = await vr.json();
    if (!v.success) return json({ error: '확인에 실패했어요. 다시 시도해주세요.' }, 403);
  }

  // 속도 제한: 같은 IP 10분에 5개
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ipHash = (await sha256(ip + '|' + (env.IP_SALT || 'nethelix'))).slice(0, 32);
  const recent = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM comments WHERE ip_hash = ? AND created_at > datetime('now', '-10 minutes')"
  ).bind(ipHash).first();
  if (recent && recent.n >= 5) return json({ error: '잠시 후 다시 남겨주세요.' }, 429);

  const status = env.AUTO_APPROVE === '1' ? 'approved' : 'pending';
  await env.DB.prepare('INSERT INTO comments (page, name, body, status, ip_hash) VALUES (?, ?, ?, ?, ?)')
    .bind(page, name, body, status, ipHash).run();
  return json({ ok: true, status });
}
