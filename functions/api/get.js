// GET /api/get?id=...  — アドバイザーが1件の詳細（回答+アドバイス）を取得
export async function onRequestGet({ request, env }) {
  if (!env.DB) return j({ ok: false, error: "DB未設定" }, 500);
  if (!admin(request, env)) return j({ ok: false, error: "認証エラー" }, 401);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return j({ ok: false, error: "id必須" }, 400);

  const row = await env.DB.prepare(
    "SELECT id, company, email, answers, advice, status, created_at, updated_at FROM submissions WHERE id=?"
  ).bind(id).first();
  if (!row) return j({ ok: false, error: "見つかりません" }, 404);

  return j({
    ok: true,
    id: row.id, company: row.company, email: row.email, status: row.status,
    created_at: row.created_at, updated_at: row.updated_at,
    answers: JSON.parse(row.answers || "{}"),
    advice: JSON.parse(row.advice || "{}"),
  });
}
function admin(request, env) {
  const t = request.headers.get("X-Admin-Token");
  return !!env.ADMIN_TOKEN && t === env.ADMIN_TOKEN;
}
function j(o, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });
}
