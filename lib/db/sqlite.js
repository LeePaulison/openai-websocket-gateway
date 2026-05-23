import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "saigely.sqlite");

export const db = new Database(dbPath);
