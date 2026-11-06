// Builds supabase/guide.private.sql (gitignored) for the groomsmen page, after checking the words
// against the same zod schema the app uses. Run: npm run guide:build
// Needs src/dev-fixture/guide.ts (private) and the pictures uploaded to the public storage bucket
// under letter-media/groomsmen/ (see docs/GROOMSMEN.md). Re-running keeps the link and PIN that
// are already in the database and only updates the words and pictures.
import { randomBytes, randomInt } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { guideContentSchema } from '../src/lib/guideTypes';

const FIXTURE = 'src/dev-fixture/guide.ts';
if (!existsSync(FIXTURE)) {
  console.error(
    `Missing ${FIXTURE}. It is gitignored, so it only exists on the machine that has it.`,
  );
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]),
);
const supabase = (env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '');
const site = (env.VITE_SITE_URL ?? '').replace(/\/$/, '');
if (!supabase || !site) {
  console.error('.env.local needs VITE_SUPABASE_URL and VITE_SITE_URL.');
  process.exit(1);
}

// A variable path keeps the type-check working on machines without the private fixture.
const fixturePath = '../src/dev-fixture/guide';
const { guideContent } = (await import(fixturePath)) as {
  guideContent: (baseUrl: string) => unknown;
};
const parsed = guideContentSchema.safeParse(
  guideContent(`${supabase}/storage/v1/object/public/letter-media/groomsmen/`),
);
if (!parsed.success) {
  console.error('The groomsmen page content does not match the schema:');
  console.error(JSON.stringify(parsed.error.issues, null, 2));
  process.exit(1);
}

// Plain ASCII, so copying through a clipboard cannot corrupt it (see build-seed.ts).
const json = JSON.stringify(parsed.data, null, 2).replace(
  /[\u0080-￿]/g,
  (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'),
);
const token = randomBytes(20).toString('hex');
const pin = String(randomInt(1000, 10000));

const sql = `-- Groomsmen page. Safe to run again: the link and PIN already in the database are kept.
insert into public.groomsmen_guide (id, token, pin, content)
values (1, '${token}', '${pin}', $guide$${json}$guide$::jsonb)
on conflict (id) do update set content = excluded.content;

select 'Link: ${site}/#/g/' || token || '   PIN: ' || pin as groomsmen_page
from public.groomsmen_guide where id = 1;
`;
writeFileSync('supabase/guide.private.sql', sql);
console.log('Wrote supabase/guide.private.sql');
