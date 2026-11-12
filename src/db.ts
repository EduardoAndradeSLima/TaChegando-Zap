import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.resolve(__dirname, '..', 'tachegando.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    phone TEXT PRIMARY KEY,
    stage TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS processed_messages (
    message_id TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export type Stage =
  | 'MENU_INICIAL'
  | 'AGUARDANDO_CEP'
  | 'CONFIRMACAO_ENDERECO'
  | 'ATENDIMENTO_HUMANO';

export function isDup(msgId: string): boolean {
  const res = db
    .prepare('INSERT OR IGNORE INTO processed_messages (message_id) VALUES (?)')
    .run(msgId);
  return res.changes === 0;
}

export function getStage(phone: string): Stage {
  const row = db
    .prepare('SELECT stage FROM sessions WHERE phone = ?')
    .get(phone) as { stage: Stage } | undefined;

  if (!row) {
    setStage(phone, 'MENU_INICIAL');
    return 'MENU_INICIAL';
  }
  return row.stage;
}

export function setStage(phone: string, stage: Stage) {
  db.prepare(`
    INSERT INTO sessions (phone, stage, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(phone) DO UPDATE SET
      stage = excluded.stage,
      updated_at = CURRENT_TIMESTAMP
  `).run(phone, stage);
}
