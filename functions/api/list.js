// GET /api/list  — アドバイザー（管理者）が送信一覧を取得
// 認証: ヘッダー X-Admin-Token が env.ADMIN_TOKEN と一致
export async function onRequestGet({ request, env }) {
  if (!env.DB) return j({ ok: false, error: "DB未設定" }, 500);
  if (!admin(request, env)) return j({ ok: false, error: "認証エラー" }, 401);

  const { results } = await env.DB.prepare(
    "SELECT id, company, email, status, created_at, updated_at FROM submissions ORDER BY created_at DESC LIMIT 500"
  ).all();
  return j({ ok: true, items: results || [] });
}
function admin(request, env) {
  const t = request.headers.get("X-Admin-Token");
  return !!env.ADMIN_TOKEN && t === env.ADMIN_TOKEN;
}
function j(o, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });
}
