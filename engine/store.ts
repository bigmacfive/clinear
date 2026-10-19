import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Card, Project, Run, RunEvent } from "../src/types.js";
export class Store {
  db: Database.Database;
  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(
      `CREATE TABLE IF NOT EXISTS records(kind TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(kind,id)); CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY AUTOINCREMENT,runId TEXT,cardId TEXT,type TEXT,text TEXT,createdAt TEXT);`,
    );
  }
  all<T>(kind: string): T[] {
    return (
      this.db
        .prepare("SELECT data FROM records WHERE kind=? ORDER BY rowid")
        .all(kind) as { data: string }[]
    ).map((r) => JSON.parse(r.data));
  }
  get<T>(kind: string, id: string): T | undefined {
    const row = this.db
      .prepare("SELECT data FROM records WHERE kind=? AND id=?")
      .get(kind, id) as { data: string } | undefined;
    return row ? JSON.parse(row.data) : undefined;
  }
  put<T extends { id: string }>(kind: string, item: T) {
    this.db
      .prepare(
        "INSERT INTO records(kind,id,data) VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data",
      )
      .run(kind, item.id, JSON.stringify(item));
    return item;
  }
  event(event: Omit<RunEvent, "id">) {
    const r = this.db
      .prepare(
        "INSERT INTO events(runId,cardId,type,text,createdAt) VALUES(@runId,@cardId,@type,@text,@createdAt)",
      )
      .run(event);
    return { ...event, id: Number(r.lastInsertRowid) };
  }
  events(cardId: string) {
    return this.db
      .prepare("SELECT * FROM events WHERE cardId=? ORDER BY id DESC LIMIT 600")
      .all(cardId)
      .reverse() as RunEvent[];
  }
  recover() {
    this.db.transaction(() => {
      for (const run of this.all<Run>("run"))
        if (run.status === "running") {
          this.put("run", {
            ...run,
            status: "interrupted",
            endedAt: new Date().toISOString(),
            summary:
              "App stopped during execution. Review existing changes before restarting.",
          });
          const card = this.get<Card>("card", run.cardId);
          if (card)
            this.put("card", { ...card, stage: "Ready", flag: "interrupted" });
        }
    })();
  }
  projects() {
    return this.all<Project>("project");
  }
  close() {
    this.db.close();
  }
}
