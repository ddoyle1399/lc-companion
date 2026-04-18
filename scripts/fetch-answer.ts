import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

async function main() {
  const id = process.argv[2];
  const { data, error } = await sb
    .from("sample_answers")
    .select("answer_text")
    .eq("id", id)
    .single();

  if (error || !data) {
    console.error(error);
    process.exit(1);
  }

  const words = data.answer_text.split(/\s+/);
  console.log("--- FIRST 300 WORDS ---\n");
  console.log(words.slice(0, 300).join(" "));
  console.log("\n\n--- LAST 200 WORDS ---\n");
  console.log(words.slice(-200).join(" "));
}

main();
