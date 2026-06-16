// POST /api/advise  — アドバイザーがコメント/ステータスを保存
// body: { id, advice:{stepNo:text}, status? }
export async function onRequestPost({ request, env }) {
  if (!env.DB) return j({ ok: false, error: "DB未設定" }, 500);
  if (!admin(request, env)) return j({ ok: false, error: "認証エラー" }, 401);
  let data;
  try { data = await request.json(); } catch { return j({ ok: false, error: "不正なリクエスト" }, 400); }
  if (!data.id) return j({ ok: false, error: "id必須" }, 400);

  const advice = JSON.stringify(data.advice || {});
  const status = ["new", "reviewing", "done"].includes(data.status) ? data.status : "reviewing";
  const now = new Date().toISOString();

  const res = await env.DB.prepare(
    "UPDATE submissions SET advice=?, status=?, updated_at=? WHERE id=?"
  ).bind(advice, status, now, data.id).run();

  if (!res.meta || res.meta.changes === 0) return j({ ok: false, error: "見つかりません" }, 404);
  return j({ ok: true, id: data.id, status });
}
function admin(request, env) {
  const t = request.headers.get("X-Admin-Token");
  return !!env.ADMIN_TOKEN && t === env.ADMIN_TOKEN;
}
function j(o, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });
}
