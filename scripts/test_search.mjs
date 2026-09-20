const base = 'http://localhost:3000/api/search';

async function run() {
  console.log('--- 1. Empty query (should be 400) ---');
  let res = await fetch(base + '?q=');
  let data = await res.json();
  console.log('Status:', res.status, JSON.stringify(data));

  console.log('\n--- 2. Exact phrase: keyword test (react) ---');
  res = await fetch(base + '?q=' + encodeURIComponent('react'));
  data = await res.json();
  console.log('Status:', res.status, '| Results:', data.results?.length);
  (data.results || []).slice(0, 3).forEach(r =>
    console.log(' -', r.title, '| score:', r.score?.toFixed(4), '| snippet:', (r.snippet || '').slice(0, 70))
  );
  console.log('Meta:', JSON.stringify(data.meta));

  console.log('\n--- 3. Semantic / paraphrase (\"neural network text understanding\") ---');
  res = await fetch(base + '?q=' + encodeURIComponent('neural network text understanding'));
  data = await res.json();
  console.log('Status:', res.status, '| Results:', data.results?.length);
  (data.results || []).slice(0, 3).forEach(r =>
    console.log(' -', r.title, '| score:', r.score?.toFixed(4))
  );

  console.log('\n--- 4. Nonsense query (empty array, not error) ---');
  res = await fetch(base + '?q=' + encodeURIComponent('zzqxthisisnotarealword'));
  data = await res.json();
  console.log('Status:', res.status, '| Results:', data.results?.length, '| Is array:', Array.isArray(data.results));
}

run().catch(console.error);
