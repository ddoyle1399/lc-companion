#!/usr/bin/env npx tsx
/**
 * seed-past-questions.mts
 *
 * Downloads LC and JC English exam papers from examinations.ie and seeds
 * the Supabase past_questions table.
 *
 * LC English Paper 2 (Higher + Ordinary, 2010-2025):
 *   - Extracts poetry questions per poet using Claude
 *   - section = 'poetry', subject_key = poet name
 *
 * JC English (Higher + Ordinary, 2010-2025):
 *   - Stores full paper text for future use
 *   - section = 'jc', subject_key = 'JC English HL' or 'JC English OL'
 *
 * examinations.ie requires an "I Agree" session before serving PDFs, so
 * Puppeteer is used once to get a valid session cookie for all downloads.
 *
 * Usage (run from lc-companion project root):
 *   npm run seed:past-questions:dry          # dry run, no DB writes
 *   npm run seed:past-questions              # full run, all years
 *   npx tsx scripts/seed-past-questions.mts --years=2023,2024,2025
 *   npx tsx scripts/seed-past-questions.mts --years=2025 --dry-run
 */

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import puppeteer from "puppeteer";
import * as pdfParseModule from "pdf-parse";

// pdf-parse v2 ships as CJS; handle both default and named export shapes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pdfParse: (buf: Buffer) => Promise<{ text: string }> =
  (pdfParseModule as any).default ?? pdfParseModule;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE_YEAR = 2010;
const TOP_YEAR = 2025;

const ARCHIVE_PAGE = "https://www.examinations.ie/exammaterialarchive/";
const LC_ARCHIVE  = "https://www.examinations.ie/archive/exampapers";
const JC_ARCHIVE  = "https://www.examinations.ie/archive/exampapers";

// LC English Paper 2 filename fragments
const LC_PAPERS: Array<{ fragment: string; level: "higher" | "ordinary"; paper: number }> = [
  { fragment: "ALP2", level: "higher",   paper: 2 },
  { fragment: "GLP2", level: "ordinary", paper: 2 },
];

// JC English filename fragments (single paper per level)
const JC_PAPERS: Array<{ fragment: string; level: "higher" | "ordinary" }> = [
  { fragment: "ALP0", level: "higher"   },
  { fragment: "GLP0", level: "ordinary" },
];

// Canonical LC poet names (must match subject_key values used in the app)
const KNOWN_POETS = [
  "W.B. Yeats",
  "Seamus Heaney",
  "Paula Meehan",
  "Eilean Ni Chuilleanain",
  "Elizabeth Bishop",
  "John Donne",
  "T.S. Eliot",
  "Tracy K. Smith",
  "Patrick Kavanagh",
  "Emily Dickinson",
  "Derek Mahon",
  "Adrienne Rich",
  "Eavan Boland",
  "Sylvia Plath",
  "Gerard Manley Hopkins",
  "Philip Larkin",
  "Ted Hughes",
  "Michael Longley",
  "Nuala Ni Dhomhnaill",
  "Brendan Kennelly",
  "Thomas Kinsella",
  "Richard Murphy",
  "Paul Durcan",
  "John Montague",
  "John Keats",
  "Robert Frost",
  "William Wordsworth",
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExamPaper {
  details: string;
  url: string;
  type: string;
}

interface SubjectYears {
  [year: string]: ExamPaper[];
}

interface DataJson {
  lc: { English?: SubjectYears; [k: string]: unknown };
  jc: { English?: SubjectYears; [k: string]: unknown };
}

interface ExtractedQuestion {
  poet: string;
  question_text: string;
  question_label: string | null;
}

interface SeedRow {
  subject_key: string;
  exam_year: number;
  paper: number;
  level: "higher" | "ordinary";
  section: string;
  question_text: string;
  source: string;
}

type Cookie = { name: string; value: string; domain: string };
type CoverageKey = string;

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const yearsFlag = args.find((a) => a.startsWith("--years="));
  let years: number[] = [];
  if (yearsFlag) {
    years = yearsFlag.replace("--years=", "").split(",").map(Number).filter((y) => !isNaN(y));
  } else {
    for (let y = BASE_YEAR; y <= TOP_YEAR; y++) years.push(y);
  }
  return { dryRun, years };
}

// ---------------------------------------------------------------------------
// Env loading
// ---------------------------------------------------------------------------

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
      }
    }
  }
  const get = (name: string) => {
    const val = process.env[name];
    if (!val) throw new Error(`Missing env var: ${name}`);
    return val;
  };
  return {
    anthropicKey: get("ANTHROPIC_API_KEY"),
    supabaseUrl:  get("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseKey:  get("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

// ---------------------------------------------------------------------------
// examfinder data.json
// ---------------------------------------------------------------------------

async function fetchDataJson(): Promise<DataJson> {
  const localPath = path.join(process.cwd(), "data", "examfinder-data.json");
  if (fs.existsSync(localPath)) {
    console.log("Using cached examfinder data.json");
    return JSON.parse(fs.readFileSync(localPath, "utf-8"));
  }
  console.log("Fetching examfinder data.json from GitHub...");
  const res = await fetch(
    "https://raw.githubusercontent.com/thomas-forbes/examfinder-ie/main/apps/web/public/data.json"
  );
  if (!res.ok) throw new Error(`Failed to fetch data.json: ${res.status}`);
  const data = (await res.json()) as DataJson;
  fs.mkdirSync(path.dirname(localPath), { recursive: true });
  fs.writeFileSync(localPath, JSON.stringify(data, null, 2));
  console.log("Cached to data/examfinder-data.json");
  return data;
}

// ---------------------------------------------------------------------------
// Session cookie acquisition via Puppeteer
// ---------------------------------------------------------------------------

async function getSessionCookies(): Promise<Cookie[]> {
  console.log("\nLaunching Puppeteer to acquire examinations.ie session...");
  const systemChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const executablePath = fs.existsSync(systemChrome) ? systemChrome : undefined;
  if (executablePath) console.log("Using system Chrome");

  const browser = await puppeteer.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });
  try {
    const page = await browser.newPage();
    await page.goto(ARCHIVE_PAGE, { waitUntil: "networkidle2", timeout: 30000 });
    await page.waitForSelector("#MaterialArchive__noTable__cbv__AgreeCheck", { timeout: 10000 });
    await page.click("#MaterialArchive__noTable__cbv__AgreeCheck");
    await page.waitForSelector("#MaterialArchive__noTable__sbv__YearSelect", { timeout: 10000 });
    const cookies = await page.cookies();
    console.log(`Session acquired (${cookies.length} cookies)\n`);
    return cookies as Cookie[];
  } finally {
    await browser.close();
  }
}

// ---------------------------------------------------------------------------
// PDF download
// ---------------------------------------------------------------------------

async function downloadPdf(url: string, cookies: Cookie[]): Promise<Buffer | null> {
  const cookieHeader = cookies
    .filter((c) => c.domain.includes("examinations.ie"))
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  try {
    const res = await fetch(url, {
      headers: {
        Cookie: cookieHeader,
        Referer: ARCHIVE_PAGE,
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) {
      console.warn(`  Not accessible: ${res.status} ${url}`);
      return null;
    }
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("pdf")) {
      console.warn(`  Unexpected content-type: ${ct}`);
      return null;
    }
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    console.warn(`  Download failed: ${err}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// PDF text extraction
// ---------------------------------------------------------------------------

async function extractText(buffer: Buffer): Promise<string> {
  try {
    const result = await pdfParse(buffer);
    return result.text;
  } catch (err) {
    console.warn(`  pdf-parse error: ${err}`);
    return "";
  }
}

// ---------------------------------------------------------------------------
// Claude: extract LC poetry questions
// ---------------------------------------------------------------------------

async function extractPoetryQuestions(
  anthropic: Anthropic,
  rawText: string,
  year: number,
  level: "higher" | "ordinary"
): Promise<ExtractedQuestion[]> {
  const levelLabel = level === "higher" ? "Higher Level" : "Ordinary Level";
  const relevant = rawText.slice(Math.floor(rawText.length * 0.35)).slice(0, 9000);

  const prompt = `You are analysing a Leaving Certificate English Paper 2 (${year}, ${levelLabel}).

Find every question in Section III (Poetry). Each question has a quoted critical statement about a poet's work followed by a discussion prompt ("Discuss this statement..." or similar).

For each question:
1. Identify the poet's name and map it to the canonical spelling from this list:
   ${KNOWN_POETS.join(", ")}
2. Extract the COMPLETE question text: quoted statement + discussion prompt, exactly as written.

Return ONLY a valid JSON array, no other text:
[
  {
    "poet": "W.B. Yeats",
    "question_label": "5",
    "question_text": "\"Yeats utilises powerful imagery...\" Discuss this statement..."
  }
]

Return [] if no poetry section is found.

PAPER TEXT:
---
${relevant}
---`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });
    const content = message.content[0];
    if (content.type !== "text") return [];
    const jsonText = content.text
      .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(jsonText);
    return Array.isArray(parsed) ? (parsed as ExtractedQuestion[]) : [];
  } catch (err) {
    console.warn(`  Claude extraction failed: ${err}`);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Existing coverage check (prevents duplicates)
// ---------------------------------------------------------------------------

function normaliseKey(name: string): string {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

async function fetchExistingCoverage(
  supabase: ReturnType<typeof createClient>,
  section: string
): Promise<Set<CoverageKey>> {
  const { data, error } = await supabase
    .from("past_questions")
    .select("subject_key,exam_year,paper,level")
    .eq("section", section);

  if (error) {
    console.warn(`Could not fetch existing ${section} coverage:`, error.message);
    return new Set();
  }
  const keys = new Set<CoverageKey>();
  for (const row of data ?? []) {
    keys.add(`${normaliseKey(row.subject_key)}|${row.exam_year}|${row.paper}|${row.level}`);
  }
  return keys;
}

// ---------------------------------------------------------------------------
// Batch insert (plain insert, duplicates already filtered above)
// ---------------------------------------------------------------------------

async function insertRows(
  supabase: ReturnType<typeof createClient>,
  rows: SeedRow[],
  dryRun: boolean
): Promise<number> {
  if (dryRun || rows.length === 0) return 0;
  const BATCH = 20;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase.from("past_questions").insert(batch);
    if (error) {
      console.error(`  Insert error (batch ${Math.floor(i / BATCH) + 1}):`, error.message);
    } else {
      inserted += batch.length;
    }
  }
  return inserted;
}

// ---------------------------------------------------------------------------
// Process LC English Paper 2 (poetry questions)
// ---------------------------------------------------------------------------

async function processLC(
  anthropic: Anthropic,
  supabase: ReturnType<typeof createClient>,
  cookies: Cookie[],
  lcData: SubjectYears,
  years: number[],
  dryRun: boolean
) {
  console.log("=== LC English Paper 2 (poetry questions) ===\n");
  const existing = await fetchExistingCoverage(supabase, "poetry");
  console.log(`Existing LC poetry coverage: ${existing.size} entries\n`);

  const newRows: SeedRow[] = [];
  let skipped = 0;

  for (const year of years) {
    const papers = lcData[String(year)] ?? [];

    for (const { fragment, level, paper } of LC_PAPERS) {
      const match = papers.find(
        (p) => p.type === "Exam Paper" && p.url.toUpperCase().includes(fragment)
      );
      if (!match) {
        console.log(`  ${year} LC ${level} P${paper}: not in examfinder data`);
        continue;
      }

      const url = `${LC_ARCHIVE}/${year}/${match.url}`;
      console.log(`${year} LC ${level} Paper ${paper}: ${match.url}`);

      const buffer = await downloadPdf(url, cookies);
      if (!buffer) continue;

      const text = await extractText(buffer);
      if (text.length < 300) { console.log("  Text too short, skipping"); continue; }
      console.log(`  ${text.length.toLocaleString()} chars extracted`);

      const questions = await extractPoetryQuestions(anthropic, text, year, level);
      console.log(`  ${questions.length} poetry question(s) found`);

      for (const q of questions) {
        if (!q.poet || !q.question_text) continue;
        const ck = `${normaliseKey(q.poet)}|${year}|${paper}|${level}`;
        if (existing.has(ck)) {
          console.log(`  [SKIP exists] ${q.poet} ${year}`);
          skipped++;
          continue;
        }
        newRows.push({
          subject_key: q.poet,
          exam_year: year,
          paper,
          level,
          section: "poetry",
          question_text: q.question_text.trim(),
          source: "examinations.ie",
        });
        console.log(`  [NEW] ${q.poet}: "${q.question_text.slice(0, 70)}..."`);
      }

      await new Promise((r) => setTimeout(r, 600));
    }
  }

  console.log(`\nLC poetry: ${newRows.length} new, ${skipped} skipped`);
  if (dryRun) {
    console.log("DRY RUN - would insert:");
    newRows.forEach((r) => console.log(`  ${r.exam_year} ${r.level} | ${r.subject_key}`));
    return;
  }
  const inserted = await insertRows(supabase, newRows, dryRun);
  console.log(`LC poetry: ${inserted} rows inserted\n`);
}

// ---------------------------------------------------------------------------
// Process JC English (full paper text, for future use)
// ---------------------------------------------------------------------------

async function processJC(
  supabase: ReturnType<typeof createClient>,
  cookies: Cookie[],
  jcData: SubjectYears,
  years: number[],
  dryRun: boolean
) {
  console.log("=== JC English (full paper, for future use) ===\n");
  const existing = await fetchExistingCoverage(supabase, "jc");
  console.log(`Existing JC coverage: ${existing.size} entries\n`);

  const newRows: SeedRow[] = [];
  let skipped = 0;

  for (const year of years) {
    const papers = jcData[String(year)] ?? [];

    for (const { fragment, level } of JC_PAPERS) {
      const match = papers.find(
        (p) => p.type === "Exam Paper" && p.url.toUpperCase().includes(fragment)
      );
      if (!match) {
        console.log(`  ${year} JC ${level}: not in examfinder data`);
        continue;
      }

      const subjectKey = level === "higher" ? "JC English HL" : "JC English OL";
      const ck = `${normaliseKey(subjectKey)}|${year}|1|${level}`;
      if (existing.has(ck)) {
        console.log(`  [SKIP exists] JC ${level} ${year}`);
        skipped++;
        continue;
      }

      const url = `${JC_ARCHIVE}/${year}/${match.url}`;
      console.log(`${year} JC ${level}: ${match.url}`);

      const buffer = await downloadPdf(url, cookies);
      if (!buffer) continue;

      const text = await extractText(buffer);
      if (text.length < 100) { console.log("  Text too short, skipping"); continue; }
      console.log(`  ${text.length.toLocaleString()} chars extracted`);

      // Store the full paper text as a single row for now.
      // No Claude call needed - raw text is sufficient for future use.
      newRows.push({
        subject_key: subjectKey,
        exam_year: year,
        paper: 1,
        level,
        section: "jc",
        question_text: text.trim().slice(0, 10000), // cap at 10k chars
        source: "examinations.ie",
      });
      console.log(`  [NEW] ${subjectKey} ${year}`);

      await new Promise((r) => setTimeout(r, 400));
    }
  }

  console.log(`\nJC: ${newRows.length} new, ${skipped} skipped`);
  if (dryRun) {
    console.log("DRY RUN - would insert:");
    newRows.forEach((r) => console.log(`  ${r.exam_year} ${r.level} | ${r.subject_key}`));
    return;
  }
  const inserted = await insertRows(supabase, newRows, dryRun);
  console.log(`JC: ${inserted} rows inserted\n`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { dryRun, years } = parseArgs();
  const { anthropicKey, supabaseUrl, supabaseKey } = loadEnv();

  const anthropic = new Anthropic({ apiKey: anthropicKey });
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("===========================================");
  console.log(" LC + JC Past Questions Seeder");
  console.log("===========================================");
  console.log(`Years:  ${years[0]}${years.length > 1 ? ` - ${years[years.length - 1]}` : ""}`);
  console.log(`Mode:   ${dryRun ? "DRY RUN (no DB writes)" : "LIVE"}`);
  console.log("===========================================\n");

  const examData = await fetchDataJson();
  const lcData = examData.lc?.English ?? {};
  const jcData = examData.jc?.English ?? {};

  // One Puppeteer session for all downloads
  const cookies = await getSessionCookies();

  await processLC(anthropic, supabase, cookies, lcData, years, dryRun);
  await processJC(supabase, cookies, jcData, years, dryRun);

  console.log("\nAll done.");
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
