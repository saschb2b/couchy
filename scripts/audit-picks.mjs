/**
 * Audit a list of canonical couch / same-screen titles against Steam's
 * `appdetails` to find which ones are NOT tagged with category 24
 * (Shared/Split Screen). Those are the only candidates that belong on the
 * editor's-picks allowlist — anything already in cat 24 surfaces via the
 * normal search rails.
 *
 * Run: `node scripts/audit-picks.mjs`
 *
 * Output: a markdown report grouped into `in cat 24 (skip)`, `false
 * negative (add as pick)`, and `failed/delisted`. Throttled ~200 ms per
 * request to stay polite to Steam's 200/5min limit.
 */

const STORE = 'https://store.steampowered.com';
const COUCH_CAT = 24;
const DELAY_MS = 250;

const CANDIDATES = [
  // Currently on the picks list — included so we can confirm whether each
  // entry is still earning its keep (i.e. is actually a cat-24 false-negative).
  { name: 'Stardew Valley', appid: 413150, group: 'current-pick' },
  { name: 'It Takes Two', appid: 1426210, group: 'current-pick' },
  { name: 'Brawlhalla', appid: 291550, group: 'current-pick' },
  { name: 'Mortal Kombat 1', appid: 1971870, group: 'current-pick' },
  { name: 'Overcooked! 2', appid: 448510, group: 'current-pick' },
  { name: 'Cuphead', appid: 268910, group: 'current-pick' },
  { name: 'Castle Crashers', appid: 204360, group: 'current-pick' },
  { name: 'A Way Out', appid: 1222700, group: 'current-pick' },
  { name: 'Lovers in a Dangerous Spacetime', appid: 252110, group: 'current-pick' },
  { name: 'Trine 2: Complete Story', appid: 35720, group: 'current-pick' },
  { name: 'Nidhogg 2', appid: 535520, group: 'current-pick' },
  { name: 'SpeedRunners', appid: 207140, group: 'current-pick' },

  // Party / chaos
  { name: 'Gang Beasts', appid: 285900, group: 'party' },
  { name: 'Ultimate Chicken Horse', appid: 386940, group: 'party' },
  { name: 'Stick Fight: The Game', appid: 674940, group: 'party' },
  { name: 'Pico Park', appid: 1509960, group: 'party' },
  { name: 'Pico Park 2', appid: 2644630, group: 'party' },
  { name: 'Move or Die', appid: 323310, group: 'party' },
  { name: 'PlateUp!', appid: 1599600, group: 'party' },
  { name: 'Moving Out', appid: 996770, group: 'party' },
  { name: 'Moving Out 2', appid: 1968370, group: 'party' },
  { name: 'The Jackbox Party Pack 10', appid: 2417580, group: 'party' },
  { name: 'The Jackbox Party Pack 9', appid: 1850960, group: 'party' },

  // Versus arena / shooters
  { name: 'TowerFall Ascension', appid: 251470, group: 'versus' },
  { name: 'Duck Game', appid: 312530, group: 'versus' },
  { name: 'Lethal League Blaze', appid: 553310, group: 'versus' },
  { name: 'Samurai Gunn', appid: 250380, group: 'versus' },

  // Brawlers / beat-em-ups
  { name: 'Streets of Rage 4', appid: 985890, group: 'brawler' },
  { name: 'Teenage Mutant Ninja Turtles: Shredder\'s Revenge', appid: 1361510, group: 'brawler' },
  { name: 'River City Girls', appid: 1041020, group: 'brawler' },
  { name: 'Fight\'N Rage', appid: 674520, group: 'brawler' },
  { name: 'Scott Pilgrim vs. The World', appid: 1453470, group: 'brawler' },

  // Fighting games
  { name: 'Tekken 8', appid: 1778820, group: 'fighting' },
  { name: 'Street Fighter 6', appid: 1364780, group: 'fighting' },
  { name: 'Mortal Kombat 11', appid: 976310, group: 'fighting' },
  { name: 'Guilty Gear Strive', appid: 1384160, group: 'fighting' },
  { name: 'Skullgirls 2nd Encore', appid: 245170, group: 'fighting' },
  { name: 'Them\'s Fightin\' Herds', appid: 574980, group: 'fighting' },
  { name: 'Dragon Ball FighterZ', appid: 678950, group: 'fighting' },

  // Co-op campaigns
  { name: 'Split Fiction', appid: 2001120, group: 'campaign' },
  { name: 'Sea of Stars', appid: 1244090, group: 'campaign' },
  { name: 'Unravel Two', appid: 952060, group: 'campaign' },
  { name: 'Operation: Tango', appid: 1167630, group: 'campaign' },
  { name: 'We Were Here', appid: 582500, group: 'campaign' },
  { name: 'Lara Croft and the Temple of Osiris', appid: 261470, group: 'campaign' },
  { name: 'Borderlands 3', appid: 397540, group: 'campaign' },
  { name: 'Borderlands 2', appid: 49520, group: 'campaign' },
  { name: 'Trine 5: A Clockwork Conspiracy', appid: 1932420, group: 'campaign' },
  { name: 'Trine 4: The Nightmare Prince', appid: 690650, group: 'campaign' },
  { name: 'Children of Morta', appid: 330020, group: 'campaign' },
  { name: 'Hammerwatch', appid: 239070, group: 'campaign' },
  { name: 'Risk of Rain Returns', appid: 1337520, group: 'campaign' },
  { name: 'Magicka', appid: 42910, group: 'campaign' },
  { name: 'Magicka 2', appid: 238370, group: 'campaign' },
  { name: 'Halo: The Master Chief Collection', appid: 976730, group: 'campaign' },
  { name: 'Resident Evil 5', appid: 21690, group: 'campaign' },
  { name: 'Resident Evil 6', appid: 221040, group: 'campaign' },
  { name: 'Overcooked! All You Can Eat', appid: 1281700, group: 'campaign' },
  { name: 'Overcooked!', appid: 274290, group: 'campaign' },

  // 2D platformers / action
  { name: 'Rayman Legends', appid: 242550, group: 'platformer' },
  { name: 'Rayman Origins', appid: 207490, group: 'platformer' },
  { name: 'Sonic Mania', appid: 584400, group: 'platformer' },
  { name: 'Sonic Origins Plus', appid: 2376820, group: 'platformer' },
  { name: 'BroForce', appid: 274190, group: 'platformer' },
  { name: 'Kingdom Two Crowns', appid: 701160, group: 'platformer' },
  { name: 'Yooka-Laylee', appid: 360830, group: 'platformer' },

  // Worms / classics
  { name: 'Worms W.M.D.', appid: 327030, group: 'classic' },
  { name: 'Worms Reloaded', appid: 22600, group: 'classic' },
  { name: 'Nidhogg', appid: 94400, group: 'classic' },
  { name: 'Hidden in Plain Sight', appid: 303590, group: 'classic' },

  // Driving
  { name: 'Wreckfest', appid: 228380, group: 'driving' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchAppDetails(appid) {
  const url = `${STORE}/api/appdetails/?appids=${appid}&cc=us&l=english`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Couchy/0.1 audit-picks',
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const wrapped = json[String(appid)];
  if (!wrapped?.success || !wrapped.data) return null;
  return wrapped.data;
}

const inCat24 = [];
const falseNegatives = [];
const failed = [];

console.log(`Auditing ${CANDIDATES.length} candidates against cat 24…\n`);

for (const c of CANDIDATES) {
  try {
    const data = await fetchAppDetails(c.appid);
    if (data === null) {
      failed.push({ ...c, reason: 'appdetails returned null' });
      continue;
    }
    const cats = (data.categories ?? []).map((x) => x.id);
    const has24 = cats.includes(COUCH_CAT);
    const has37 = cats.includes(37);
    const has39 = cats.includes(39);
    const row = { ...c, name: data.name, type: data.type, cats, has24, has37, has39 };
    if (data.type !== 'game') {
      failed.push({ ...row, reason: `type=${data.type}` });
    } else if (has24) {
      inCat24.push(row);
    } else {
      falseNegatives.push(row);
    }
    process.stdout.write(`  ${has24 ? '✓' : '✗'} ${data.name}\n`);
  } catch (err) {
    failed.push({ ...c, reason: err.message });
    process.stdout.write(`  ! ${c.name}: ${err.message}\n`);
  }
  await sleep(DELAY_MS);
}

console.log('\n## In cat 24 (skip — already surfaces via search rails)');
for (const g of inCat24) {
  const tags = [g.has37 ? '37' : null, g.has39 ? '39' : null].filter(Boolean).join(',') || '—';
  console.log(`  - ${g.name} (${g.appid}) [${g.group}] children: ${tags}`);
}

console.log('\n## False negatives (add as pick — couch but missing cat 24)');
for (const g of falseNegatives) {
  console.log(`  - ${g.name} (${g.appid}) [${g.group}] cats: [${g.cats.join(',')}]`);
}

console.log('\n## Failed / delisted / non-game');
for (const g of failed) {
  console.log(`  - ${g.name} (${g.appid}) [${g.group}] — ${g.reason}`);
}

console.log(
  `\nSummary: ${inCat24.length} in cat 24, ${falseNegatives.length} false negatives, ${failed.length} failed`,
);
