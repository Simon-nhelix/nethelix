(function () {
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function fmt(iso) { try { return new Date(iso.replace(' ', 'T') + 'Z').toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }); } catch { return iso; } }

  async function load(box) {
    const page = box.dataset.page;
    const list = box.querySelector('.cmt-list');
    list.innerHTML = '<p class="cmt-muted">불러오는 중…</p>';
    try {
      const r = await fetch('/api/comments?page=' + encodeURIComponent(page));
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || r.status);
      if (!d.comments.length) { list.innerHTML = '<p class="cmt-muted">아직 남겨진 글이 없어요. 첫 글을 남겨주세요!</p>'; return; }
      list.innerHTML = d.comments.map(c =>
        '<div class="cmt-item"><div class="cmt-meta"><b>' + esc(c.name) + '</b> <span>' + fmt(c.created_at) + '</span></div><div class="cmt-body">' + esc(c.body).replace(/\n/g, '<br>') + '</div></div>'
      ).join('');
    } catch (e) { list.innerHTML = '<p class="cmt-muted">글을 불러오지 못했어요. (' + esc(e.message) + ')</p>'; }
  }

  function init(box) {
    const page = box.dataset.page;
    const siteKey = box.dataset.sitekey || '';
    box.innerHTML =
      '<form class="cmt-form">' +
      '<input name="name" maxlength="30" placeholder="닉네임" required>' +
      '<textarea name="body" maxlength="1000" rows="3" placeholder="한마디 남겨주세요 (승인 후 공개됩니다)" required></textarea>' +
      (siteKey ? '<div class="cf-turnstile" data-sitekey="' + esc(siteKey) + '" data-theme="auto"></div>' : '') +
      '<div class="cmt-actions"><button type="submit">남기기</button><span class="cmt-msg"></span></div>' +
      '</form><div class="cmt-list"></div>';
    if (siteKey && !document.querySelector('script[src*="turnstile"]')) {
      const s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'; s.async = true; s.defer = true; document.head.appendChild(s);
    }
    const form = box.querySelector('.cmt-form');
    const msg = box.querySelector('.cmt-msg');
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const btn = form.querySelector('button'); btn.disabled = true; msg.textContent = '보내는 중…';
      const fd = new FormData(form);
      const payload = { page, name: fd.get('name'), body: fd.get('body'), turnstileToken: fd.get('cf-turnstile-response') || '' };
      try {
        const r = await fetch('/api/comments', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || r.status);
        msg.textContent = d.status === 'approved' ? '남겨졌어요. 고마워요!' : '남겨졌어요. 확인 후 공개할게요. 고마워요!';
        form.reset();
        if (window.turnstile) try { window.turnstile.reset(); } catch {}
        if (d.status === 'approved') load(box);
      } catch (e) { msg.textContent = e.message; }
      finally { btn.disabled = false; }
    });
    load(box);
  }

  document.querySelectorAll('[data-comments]').forEach(init);
})();
