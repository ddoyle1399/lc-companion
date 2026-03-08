export type CopyrightStatus = 'public_domain' | 'rights_managed';

export interface PoetConfig {
  name: string;
  status: CopyrightStatus;
  deathYear?: number;
  notes?: string;
}

/**
 * Single source of truth for copyright status of all prescribed LC English poets.
 * Covers 2026 and 2027 Higher Level cycles.
 *
 * Rule: a poet is public_domain only if their work is confirmed out of copyright
 * in Ireland/EU (generally 70 years after death). All others are rights_managed.
 * Unknown poets always default to rights_managed.
 */
const POETS: PoetConfig[] = [
  // --- 2026 HL poets ---
  { name: 'Elizabeth Bishop', status: 'rights_managed', deathYear: 1979, notes: 'Died 1979; works under copyright until at least 2049 in EU' },
  { name: 'John Donne', status: 'public_domain', deathYear: 1631 },
  { name: 'T.S. Eliot', status: 'rights_managed', deathYear: 1965, notes: 'Died 1965; works under copyright until at least 2035 in EU' },
  { name: 'Seamus Heaney', status: 'rights_managed', deathYear: 2013, notes: 'Died 2013; works under copyright until at least 2083 in EU' },
  { name: 'Paula Meehan', status: 'rights_managed', notes: 'Living poet' },
  { name: 'Eiléan Ní Chuilleanáin', status: 'rights_managed', notes: 'Living poet' },
  { name: 'Tracy K. Smith', status: 'rights_managed', notes: 'Living poet' },
  { name: 'W.B. Yeats', status: 'public_domain', deathYear: 1939, notes: 'Died 1939; works entered EU public domain 2010' },

  // --- 2027 HL poets (rotating in) ---
  { name: 'Emily Dickinson', status: 'public_domain', deathYear: 1886 },
  { name: 'Patrick Kavanagh', status: 'rights_managed', deathYear: 1967, notes: 'Died 1967; works under copyright until at least 2037 in EU' },
  { name: 'Derek Mahon', status: 'rights_managed', deathYear: 2020, notes: 'Died 2020; works under copyright until at least 2090 in EU' },
  { name: 'Adrienne Rich', status: 'rights_managed', deathYear: 2012, notes: 'Died 2012; works under copyright until at least 2082 in EU' },

  // --- OL-only poets (2026) that may appear in video pipeline ---
  { name: 'Fleur Adcock', status: 'rights_managed', notes: 'Living poet' },
  { name: 'Elizabeth Barrett Browning', status: 'public_domain', deathYear: 1861 },
  { name: 'Colette Bryce', status: 'rights_managed', notes: 'Living poet' },
  { name: 'Kate Clancy', status: 'rights_managed', notes: 'Living poet; REVIEW: confirm copyright status' },
  { name: 'Rita Dove', status: 'rights_managed', notes: 'Living poet' },
  { name: 'Colm Keegan', status: 'rights_managed', notes: 'Living poet' },
  { name: 'Paul Muldoon', status: 'rights_managed', notes: 'Living poet' },
  { name: 'Naomi Shihab Nye', status: 'rights_managed', notes: 'Living poet' },
  { name: 'Mary Oliver', status: 'rights_managed', deathYear: 2019, notes: 'Died 2019; works under copyright until at least 2089 in EU' },
  { name: 'Edgar Allan Poe', status: 'public_domain', deathYear: 1849 },
  { name: 'Percy Bysshe Shelley', status: 'public_domain', deathYear: 1822 },
  { name: 'Penelope Shuttle', status: 'rights_managed', notes: 'Living poet' },
  { name: 'Jessica Traynor', status: 'rights_managed', notes: 'Living poet' },
  { name: 'William Carlos Williams', status: 'rights_managed', deathYear: 1963, notes: 'Died 1963; works under copyright until at least 2033 in EU' },
  { name: 'James Wright', status: 'rights_managed', deathYear: 1980, notes: 'Died 1980; works under copyright until at least 2050 in EU' },
  { name: 'Benjamin Zephaniah', status: 'rights_managed', deathYear: 2023, notes: 'Died 2023; works under copyright until at least 2093 in EU' },
];

const poetMap = new Map<string, PoetConfig>();
for (const poet of POETS) {
  poetMap.set(poet.name.toLowerCase(), poet);
}

/**
 * Look up a poet's copyright mode. Returns 'rights_managed' for unknown poets.
 */
export function getCopyrightMode(poetName: string): CopyrightStatus {
  const config = poetMap.get(poetName.toLowerCase());
  if (!config) {
    console.warn(
      `[copyright] Poet "${poetName}" not found in poets.config.ts. Defaulting to rights_managed.`
    );
    return 'rights_managed';
  }
  return config.status;
}

export { POETS };
