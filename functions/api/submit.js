// POST /api/submit  — 企業が戦略書を送信（新規 or 更新）
// body: { company, email, answers, docText?, score?, id?, token? }
// 保存後、Resend 経由で hello@s-labo.earth と登録ユーザーの両方に全文メールを送信する。
export async function onRequestPost({ request, env }) {
  if (!env.DB) return j({ ok: false, error: "DB未設定" }, 500);
  let data;
  try { data = await request.json(); } catch { return j({ ok: false, error: "不正なリクエスト" }, 400); }

  const answers = JSON.stringify(data.answers || {});
  const company = String(data.company || "").slice(0, 200);
  const email   = String(data.email || "").slice(0, 200);
  const docText = String(data.docText || "").slice(0, 100000);
  const score   = String(data.score || "");
  const now     = new Date().toISOString();

  let id, token, updated = false;

  // 既存の更新（id + token 一致時）
  if (data.id && data.token) {
    const row = await env.DB.prepare("SELECT token FROM submissions WHERE id = ?").bind(data.id).first();
    if (row && row.token === data.token) {
      await env.DB.prepare(
        "UPDATE submissions SET company=?, email=?, answers=?, updated_at=? WHERE id=?"
      ).bind(company, email, answers, now, data.id).run();
      id = data.id; token = data.token; updated = true;
    }
  }

  // 新規作成
  if (!id) {
    id = crypto.randomUUID();
    token = crypto.randomUUID().replace(/-/g, "");
    await env.DB.prepare(
      `INSERT INTO submissions (id, token, company, email, answers, advice, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, '{}', 'new', ?, ?)`
    ).bind(id, token, company, email, answers, now, now).run();
  }

  // メール送信（DB保存は成功済み。メール失敗時も保存自体は成功として返す）
  const mail = await sendEmails(env, { company, email, docText, score, updated });

  return j({ ok: true, id, token, updated, emailed: mail.ok, emailError: mail.error || null });
}

// hello@s-labo.earth（運営）と登録ユーザーの双方へ全文メールを送る
async function sendEmails(env, { company, email, docText, score, updated }) {
  const key = env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "RESEND_API_KEY未設定" };

  const from  = env.MAIL_FROM || "シセイラボ 戦略立案 <noreply@s-labo.earth>";
  const admin = env.MAIL_TO   || "hello@s-labo.earth";
  const head  = `会社名：${company || "（未入力）"}\nメール：${email || "（未入力）"}\n完成度：${score || "—"}\n送信種別：${updated ? "更新" : "新規"}\n` +
                "────────────────────────\n\n";
  const body  = head + (docText || "（本文なし）");

  const tasks = [];
  // 運営宛（全文）。返信先はユーザーに。
  tasks.push(send(key, {
    from, to: [admin], reply_to: email || undefined,
    subject: `【戦略書${updated ? "更新" : "送信"}】${company || "無名"} 様`,
    text: body,
  }));
  // ユーザー宛（全文）。返信先は運営に。
  if (email) {
    tasks.push(send(key, {
      from, to: [email], reply_to: admin,
      subject: "【シセイラボ】マーケティング戦略書を受け付けました",
      text: "この度はシセイラボの戦略立案ツールをご利用いただきありがとうございます。\n" +
            "以下の内容で受け付けました。担当者よりアドバイスをお送りします。\n\n" + body,
    }));
  }

  const results = await Promise.allSettled(tasks);
  const failed = results.filter(r => r.status === "rejected" || (r.value && r.value.ok === false));
  if (failed.length) {
    const reason = failed[0].reason?.message || failed[0].value?.error || "送信失敗";
    return { ok: false, error: String(reason).slice(0, 300) };
  }
  return { ok: true };
}

async function send(key, payload) {
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      let msg = `HTTP ${r.status}`;
      try { const e = await r.json(); if (e && e.message) msg = e.message; } catch {}
      return { ok: false, error: msg };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || "ネットワークエラー" };
  }
}

function j(o, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });
}
