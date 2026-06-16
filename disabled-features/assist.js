// POST /api/assist — AI壁打ち（各STEPで示唆・問い・コピー案を生成）
// body: { stepNo, title, purpose, frameworks:[], qa:[{q,a}], prior:"..." }
// Claude API (Anthropic) を raw HTTP で呼び出す。モデルは claude-opus-4-8。
export async function onRequestPost({ request, env }) {
  if (!env.ANTHROPIC_API_KEY) return j({ ok: false, error: "AI未設定（ANTHROPIC_API_KEY）" }, 503);
  let data;
  try { data = await request.json(); } catch { return j({ ok: false, error: "不正なリクエスト" }, 400); }

  const title = String(data.title || "").slice(0, 200);
  const purpose = String(data.purpose || "").slice(0, 600);
  const frameworks = Array.isArray(data.frameworks) ? data.frameworks.slice(0, 12).join(", ") : "";
  const qa = Array.isArray(data.qa) ? data.qa.slice(0, 10) : [];
  const prior = String(data.prior || "").slice(0, 4000);

  const qaText = qa.map((p, i) => `Q${i + 1}. ${p.q}\nA${i + 1}. ${(p.a && p.a.trim()) ? p.a : "（未入力）"}`).join("\n\n");

  const SYSTEM = [
    "あなたはシセイラボのシニア・マーケティング戦略コンサルタントです。",
    "シセイラボの「12STEPマーケティング実践メソッド」（現状分析→戦略→設計→戦術→実行の積み上げ式）に沿って、利用企業の戦略立案を壁打ち相手として支援します。",
    "重要な思想：①全ての施策はブランド・エクイティを届ける手法にすぎず、選択確率を決める『戦略エクイティ』が核 ②WHO→WHAT→HOWの順（HOWは最後）③消費者は欲求が抵抗を上回ったとき選択する。",
    "出力は必ず日本語。一般論を避け、その企業の回答内容に即した具体的・実践的な助言にすること。回答が未入力の場合は、そのSTEPをどう埋めるべきか具体例を示して導く。断定しすぎず、根拠と問いで思考を前進させる。",
  ].join("\n");

  const USER = `# 対象STEP\nSTEP${data.stepNo}：${title}\n目的：${purpose}\n使うフレームワーク：${frameworks}\n\n# この企業の現在の回答\n${qaText}\n\n# これまでのSTEPの文脈（参考）\n${prior || "（なし）"}\n\n上記をふまえ、このSTEPの内容を磨くための壁打ちをしてください。`;

  const SCHEMA = {
    type: "object",
    properties: {
      insights:  { type: "array", items: { type: "string" }, description: "回答への気づき・改善点（具体的に）" },
      questions: { type: "array", items: { type: "string" }, description: "さらに深掘りすべき問い" },
      examples:  { type: "array", items: { type: "string" }, description: "コピー案・言い換え・具体例" },
      next_step: { type: "string", description: "次にとるべき一手（1〜2文）" },
    },
    required: ["insights", "questions", "examples", "next_step"],
    additionalProperties: false,
  };

  let res;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-8",
        max_tokens: 2048,
        system: SYSTEM,
        messages: [{ role: "user", content: USER }],
        output_config: { format: { type: "json_schema", schema: SCHEMA } },
      }),
    });
  } catch (e) {
    return j({ ok: false, error: "AIに接続できませんでした" }, 502);
  }

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    return j({ ok: false, error: "AI応答エラー", detail: t.slice(0, 300) }, 502);
  }
  const out = await res.json();
  const text = (out.content || []).filter(b => b.type === "text").map(b => b.text).join("");
  let parsed;
  try { parsed = JSON.parse(text); }
  catch { parsed = { insights: [text || "（応答を解析できませんでした）"], questions: [], examples: [], next_step: "" }; }
  return j({ ok: true, result: parsed });
}

function j(o, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });
}
