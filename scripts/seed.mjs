import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

// Load the project root .env.local automatically. This makes `npm run seed`
// behave consistently with Next.js without requiring `node --env-file=...`.
const envPath = fileURLToPath(new URL('../.env.local', import.meta.url));
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const confirmation = process.env.SEED_CONFIRM;

const isPlaceholder = (value) =>
  !value || value.includes('YOUR_PROJECT') || value.includes('REPLACE_ME');

if (isPlaceholder(url) || isPlaceholder(serviceKey)) {
  throw new Error(
    [
      'Supabase is not configured for the development seed.',
      'Open .env.local in the project root and replace the placeholder values with the real project credentials:',
      '- NEXT_PUBLIC_SUPABASE_URL',
      '- SUPABASE_SERVICE_ROLE_KEY',
      'Do not paste the service-role key into chat or commit .env.local to Git.',
    ].join('\n'),
  );
}

if (confirmation !== 'DEVELOPMENT_ONLY') {
  throw new Error(
    [
      'Development seed protection is enabled.',
      'Add this exact line to the project root .env.local:',
      'SEED_CONFIRM=DEVELOPMENT_ONLY',
    ].join('\n'),
  );
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const users = [
  ['Jhonathan', 'jhonathan@arena.local'],
  ['Pedro', 'pedro@arena.local'],
  ['Lucas', 'lucas@arena.local'],
  ['Marcos', 'marcos@arena.local'],
];

const ids = new Map();
for (const [name, email] of users) {
  const { data: listed, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;
  let user = listed.users.find((candidate) => candidate.email === email);

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: 'ArenaDev123!',
      email_confirm: true,
      user_metadata: { name },
      app_metadata: { approved: true },
    });
    if (error) throw error;
    user = data.user;
  }

  ids.set(name, user.id);
}

const { data: sport, error: sportError } = await supabase
  .from('sports')
  .select('id')
  .eq('slug', 'ping-pong')
  .single();
if (sportError) throw sportError;

const { data: existingSeason, error: seasonReadError } = await supabase
  .from('seasons')
  .select('id')
  .eq('sport_id', sport.id)
  .eq('slug', '2026-10')
  .maybeSingle();
if (seasonReadError) throw seasonReadError;

let seasonId = existingSeason?.id;
if (!seasonId) {
  const { data: season, error } = await supabase
    .from('seasons')
    .insert({
      sport_id: sport.id,
      name: 'Outubro 2026',
      slug: '2026-10',
      starts_at: '2026-10-01T03:00:00.000Z',
      ends_at: '2026-11-01T03:00:00.000Z',
      status: 'active',
      created_by: ids.get('Jhonathan'),
    })
    .select('id')
    .single();
  if (error) throw error;
  seasonId = season.id;
}

const fixtures = [
  ['00000000-0000-4000-8000-000000000001', 'Jhonathan', 2, 'Pedro', 1],
  ['00000000-0000-4000-8000-000000000002', 'Lucas', 0, 'Marcos', 2],
  ['00000000-0000-4000-8000-000000000003', 'Pedro', 2, 'Lucas', 0],
];

for (const [requestId, aName, aScore, bName, bScore] of fixtures) {
  const createdBy = ids.get(aName);
  const opponent = ids.get(bName);
  const { data: existing } = await supabase
    .from('matches')
    .select('id')
    .eq('created_by', createdBy)
    .eq('request_id', requestId)
    .maybeSingle();

  if (existing) continue;

  const { data: match, error: matchError } = await supabase
    .from('matches')
    .insert({
      season_id: seasonId,
      created_by: createdBy,
      request_id: requestId,
      status: 'confirmed',
      confirmed_by: opponent,
      confirmed_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (matchError) throw matchError;

  const { data: sides, error: sideError } = await supabase
    .from('match_sides')
    .insert([
      { match_id: match.id, side: 1, score: aScore },
      { match_id: match.id, side: 2, score: bScore },
    ])
    .select('id, side');
  if (sideError) throw sideError;

  const sideA = sides.find((side) => side.side === 1);
  const sideB = sides.find((side) => side.side === 2);
  if (!sideA || !sideB) throw new Error('Seed sides were not created.');

  const { error: participantError } = await supabase.from('match_participants').insert([
    { match_id: match.id, side_id: sideA.id, profile_id: createdBy },
    { match_id: match.id, side_id: sideB.id, profile_id: opponent },
  ]);
  if (participantError) throw participantError;
}

console.info('Development seed complete.');
console.info('Password for seeded users: ArenaDev123!');
