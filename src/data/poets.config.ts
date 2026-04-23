import { normalisePoetName } from "@/lib/normalisePoetName";

export type CopyrightStatus = "public_domain" | "rights_managed";

interface PoetConfig {
  name: string;
  status: CopyrightStatus;
  deathYear?: number;
  notes?: string;
}

const POETS: PoetConfig[] = [
  // 2026 HL
  { name: "Elizabeth Bishop", status: "rights_managed", deathYear: 1979, notes: "Died 1979; copyright until at least 2049 in EU" },
  { name: "John Donne", status: "public_domain", deathYear: 1631 },
  { name: "T.S. Eliot", status: "rights_managed", deathYear: 1965, notes: "Died 1965; copyright until at least 2035 in EU" },
  { name: "Seamus Heaney", status: "rights_managed", deathYear: 2013, notes: "Died 2013; copyright until at least 2083 in EU" },
  { name: "Paula Meehan", status: "rights_managed", notes: "Living poet" },
  { name: "Eiléan Ní Chuilleanáin", status: "rights_managed", notes: "Living poet" },
  { name: "Tracy K. Smith", status: "rights_managed", notes: "Living poet" },
  { name: "W.B. Yeats", status: "public_domain", deathYear: 1939 },

  // 2026 OL additions
  { name: "Fleur Adcock", status: "rights_managed", notes: "Living poet" },
  { name: "Elizabeth Barrett Browning", status: "public_domain", deathYear: 1861 },
  { name: "Colette Bryce", status: "rights_managed", notes: "Living poet" },
  { name: "Kate Clancy", status: "rights_managed", notes: "Living poet" },
  { name: "Rita Dove", status: "rights_managed", notes: "Living poet" },
  { name: "Colm Keegan", status: "rights_managed", notes: "Living poet" },
  { name: "Paul Muldoon", status: "rights_managed", notes: "Living poet" },
  { name: "Naomi Shihab Nye", status: "rights_managed", notes: "Living poet" },
  { name: "Mary Oliver", status: "rights_managed", deathYear: 2019, notes: "Died 2019; copyright until at least 2089 in EU" },
  { name: "Edgar Allan Poe", status: "public_domain", deathYear: 1849 },
  { name: "Percy Bysshe Shelley", status: "public_domain", deathYear: 1822 },
  { name: "Penelope Shuttle", status: "rights_managed", notes: "Living poet" },
  { name: "Jessica Traynor", status: "rights_managed", notes: "Living poet" },
  { name: "William Carlos Williams", status: "rights_managed", deathYear: 1963, notes: "Died 1963; copyright until at least 2033 in EU" },
  { name: "James Wright", status: "rights_managed", deathYear: 1980, notes: "Died 1980; copyright until at least 2050 in EU" },
  { name: "Benjamin Zephaniah", status: "rights_managed", deathYear: 2023, notes: "Died 2023; copyright until at least 2093 in EU" },

  // 2027 HL additions
  { name: "Emily Dickinson", status: "public_domain", deathYear: 1886 },
  { name: "Patrick Kavanagh", status: "rights_managed", deathYear: 1967, notes: "Died 1967; copyright until at least 2037 in EU" },
  { name: "Derek Mahon", status: "rights_managed", deathYear: 2020, notes: "Died 2020; copyright until at least 2090 in EU" },
  { name: "Adrienne Rich", status: "rights_managed", deathYear: 2012, notes: "Died 2012; copyright until at least 2082 in EU" },

  // 2027 OL additions
  { name: "Gwendolyn Brooks", status: "rights_managed", deathYear: 2000, notes: "Died 2000; copyright until at least 2070 in EU" },
  { name: "Carol Ann Duffy", status: "rights_managed", notes: "Living poet" },
  { name: "Linda France", status: "rights_managed", notes: "Living poet" },
  { name: "Alison Joseph", status: "rights_managed", notes: "Living poet; REVIEW: confirm copyright status" },
  { name: "Rachel Loden", status: "rights_managed", notes: "Living poet; REVIEW" },
  { name: "Sinéad Morrissey", status: "rights_managed", notes: "Living poet" },
  { name: "Alden Nowlan", status: "rights_managed", deathYear: 1983, notes: "Died 1983; copyright until at least 2053 in EU" },
  { name: "Felicia Olusanya", status: "rights_managed", notes: "Living poet" },
  { name: "Billy Ramsell", status: "rights_managed", notes: "Living poet" },
  { name: "Edwin Arlington Robinson", status: "public_domain", deathYear: 1935 },
  { name: "Tim Seibles", status: "rights_managed", notes: "Living poet" },
  { name: "William Shakespeare", status: "public_domain", deathYear: 1616 },
  { name: "Degna Stone", status: "rights_managed", notes: "Living poet" },

  // 2028 HL additions
  { name: "Gerard Manley Hopkins", status: "public_domain", deathYear: 1889 },
  { name: "Sylvia Plath", status: "rights_managed", deathYear: 1963, notes: "Died 1963; works under copyright until at least 2033 in EU" },

  // 2028 OL additions
  { name: "Maya Angelou", status: "rights_managed", deathYear: 2014, notes: "Died 2014; copyright until at least 2084 in EU" },
  { name: "Raymond Carver", status: "rights_managed", deathYear: 1988, notes: "Died 1988; copyright until at least 2058 in EU" },
  { name: "Austin Clarke", status: "rights_managed", deathYear: 1974, notes: "Died 1974; copyright until at least 2044 in EU" },
  { name: "Samuel Taylor Coleridge", status: "public_domain", deathYear: 1834 },
  { name: "Tom French", status: "rights_managed", notes: "Living poet" },
  { name: "Nikki Giovanni", status: "rights_managed", deathYear: 2024, notes: "Died 2024; copyright until at least 2094 in EU" },
  { name: "Vona Groarke", status: "rights_managed", notes: "Living poet" },
  { name: "Ted Hughes", status: "rights_managed", deathYear: 1998, notes: "Died 1998; copyright until at least 2068 in EU" },
  { name: "Bernard O'Donoghue", status: "rights_managed", notes: "Living poet" },
  { name: "Elizabeth Smither", status: "rights_managed", notes: "Living poet" },
  { name: "Wisława Szymborska", status: "rights_managed", deathYear: 2012, notes: "Died 2012; copyright until at least 2082 in EU" },
];

const poetMap = new Map<string, CopyrightStatus>(
  POETS.map((p) => [normalisePoetName(p.name), p.status])
);

export function getCopyrightMode(poetName: string): CopyrightStatus {
  const key = normalisePoetName(poetName);
  const status = poetMap.get(key);
  if (status === undefined) {
    console.warn(`Poet "${poetName}" not found in poets.config.ts — defaulting to rights_managed`);
    return "rights_managed";
  }
  return status;
}
