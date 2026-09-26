// Off-chain registry for what the chain does not hold: token artwork, the
// description, and which Panta market belongs to which launch. One JSON file;
// the volume here is a few hundred launches, not millions.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "launches.json");
const FILES_DIR = path.join(DATA_DIR, "files");

export type MarketLink = {
  eventPda: string;
  marketId?: string;
  question: string;
  endTime: number;
  createdTx: string;
  createdAt: number;
};

export type LaunchRecord = {
  mint: string;
  pool: string;
  name: string;
  symbol: string;
  description: string;
  image: string | null;
  creator: string;
  createdAt: number;
  createdTx?: string;
  market?: MarketLink;
};

type Db = { launches: Record<string, LaunchRecord> };

function read(): Db {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch {
    return { launches: {} };
  }
}

function write(db: Db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

export function getLaunch(mint: string): LaunchRecord | null {
  return read().launches[mint] ?? null;
}

export function allLaunches(): LaunchRecord[] {
  return Object.values(read().launches);
}

export function putLaunch(rec: LaunchRecord) {
  const db = read();
  db.launches[rec.mint] = rec;
  write(db);
}

export function updateLaunch(mint: string, patch: Partial<LaunchRecord>) {
  const db = read();
  const cur = db.launches[mint];
  if (!cur) throw new Error(`unknown launch ${mint}`);
  db.launches[mint] = { ...cur, ...patch };
  write(db);
  return db.launches[mint];
}

const IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

// Accepts a data: URL from the launch form, returns the stored file name.
export function saveImage(dataUrl: string): string {
  const m = /^data:(image\/[a-z]+);base64,(.+)$/.exec(dataUrl);
  if (!m) throw new Error("image must be a base64 data URL");
  const ext = IMAGE_TYPES[m[1]];
  if (!ext) throw new Error(`unsupported image type ${m[1]}`);
  const bytes = Buffer.from(m[2], "base64");
  if (bytes.length > 2 * 1024 * 1024) throw new Error("image is larger than 2 MB");
  const name = `${crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 24)}.${ext}`;
  fs.mkdirSync(FILES_DIR, { recursive: true });
  fs.writeFileSync(path.join(FILES_DIR, name), bytes);
  return name;
}

export function readFile(name: string): { bytes: Buffer; type: string } | null {
  if (!/^[a-f0-9]{24}\.(png|jpg|webp|gif)$/.test(name)) return null;
  const file = path.join(FILES_DIR, name);
  if (!fs.existsSync(file)) return null;
  const ext = name.split(".").pop()!;
  const type = Object.entries(IMAGE_TYPES).find(([, e]) => e === ext)![0];
  return { bytes: fs.readFileSync(file), type };
}
