// GET /api/mine?id=...&token=...  — 企業が自分の回答とアドバイスを取得
export async function onRequestGet({ request, env }) {
  if (!env.DB) return j({ ok: false, error: "DB未設定" }, 500);
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const token = url.searchParams.get("token");
  if (!id || !token) return j({ ok: false, error: "id/token必須" }, 400);

  const row = await env.DB.prepare(
    "SELECT id, company, email, answers, advice, status, updated_at FROM submissions WHERE id=? AND token=?"
  ).bind(id, token).first();
  if (!row) return j({ ok: false, error: "見つかりません" }, 404);

  return j({
    ok: true,
    id: row.id, company: row.company, email: row.email, status: row.status,
    updated_at: row.updated_at,
    answers: JSON.parse(row.answers || "{}"),
    advice: JSON.parse(row.advice || "{}"),
  });
}
function j(o, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });
}
