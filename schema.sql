-- シセイラボ 戦略立案システム / D1 スキーマ
CREATE TABLE IF NOT EXISTS submissions (
  id          TEXT PRIMARY KEY,      -- 公開ID (UUID)
  token       TEXT NOT NULL,         -- 企業本人確認用シークレット
  company     TEXT,                  -- 会社名
  email       TEXT,                  -- 連絡先メール
  answers     TEXT NOT NULL,         -- 12STEPの回答 (JSON)
  advice      TEXT NOT NULL DEFAULT '{}', -- アドバイザーのコメント (JSON: {stepNo: text})
  status      TEXT NOT NULL DEFAULT 'new',-- new | reviewing | done
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions(created_at DESC);
