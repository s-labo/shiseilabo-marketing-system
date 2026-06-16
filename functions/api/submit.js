// POST /api/submit  — 企業が戦略書を送信（新規 or 更新）
// body: { company, email, answers, id?, token? }
export async function onRequestPost({ request, env }) {
  if (!env.DB) return j({ ok: false, error: "DB未設定" }, 500);
  let data;
  try { data = await request.json(); } catch { return j({ ok: false, error: "不正なリクエスト" }, 400); }

  const answers = JSON.stringify(data.answers || {});
  const company = String(data.company || "").slice(0, 200);
  const email   = String(data.email || "").slice(0, 200);
  const now     = new Date().toISOString();

  // 既存の更新（id + token 一致時）
  if (data.id && data.token) {
    const row = await env.DB.prepare("SELECT token FROM submissions WHERE id = ?").bind(data.id).first();
    if (row && row.token === data.token) {
      await env.DB.prepare(
        "UPDATE submissions SET company=?, email=?, answers=?, updated_at=? WHERE id=?"
      ).bind(company, email, answers, now, data.id).run();
      return j({ ok: true, id: data.id, token: data.token, updated: true });
    }
  }

  // 新規作成
  const id = crypto.randomUUID();
  const token = crypto.randomUUID().replace(/-/g, "");
  await env.DB.prepare(
    `INSERT INTO submissions (id, token, company, email, answers, advice, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, '{}', 'new', ?, ?)`
  ).bind(id, token, company, email, answers, now, now).run();
  return j({ ok: true, id, token, updated: false });
}

function j(o, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });
}
