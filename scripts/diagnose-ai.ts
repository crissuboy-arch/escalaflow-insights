import dotenv from 'dotenv';
dotenv.config();

async function test(name: string, fn: () => Promise<string>) {
  try {
    const result = await fn();
    console.log(`✅ ${name}: OK — "${result.slice(0, 50)}"`);
  } catch (e: any) {
    console.log(`❌ ${name}: FALHOU — ${e.message}`);
  }
}

async function main() {
  console.log('\n=== DIAGNÓSTICO DE APIs ===\n');

  // ── Chaves de IA ─────────────────────────────────────────────────────────────
  console.log('--- Chaves de IA ---');
  console.log('GEMINI_API_KEY:    ', process.env.GEMINI_API_KEY     ? '✅ presente' : '❌ ausente');
  console.log('ANTHROPIC_API_KEY: ', process.env.ANTHROPIC_API_KEY  ? '✅ presente' : '❌ ausente');
  console.log('OPENAI_API_KEY:    ', process.env.OPENAI_API_KEY     ? '✅ presente' : '❌ ausente');

  // ── Chaves Apify ─────────────────────────────────────────────────────────────
  console.log('\n--- Chaves Apify ---');
  console.log('APIFY_TOKEN:               ', process.env.APIFY_TOKEN              ? '✅ presente' : '❌ ausente');
  console.log('APIFY_BASE_URL:            ', process.env.APIFY_BASE_URL           ? '✅ presente' : '❌ ausente');
  console.log('APIFY_META_ADS_ACTOR:      ', process.env.APIFY_META_ADS_ACTOR     ? '✅ presente' : '❌ ausente');
  console.log('APIFY_INSTAGRAM_ACTOR:     ', process.env.APIFY_INSTAGRAM_ACTOR    ? '✅ presente' : '❌ ausente');
  console.log('APIFY_TIKTOK_ACTOR:        ', process.env.APIFY_TIKTOK_ACTOR       ? '✅ presente' : '❌ ausente');
  console.log('APIFY_GOOGLE_TRENDS_ACTOR: ', process.env.APIFY_GOOGLE_TRENDS_ACTOR ? '✅ presente' : '❌ ausente');
  console.log('APIFY_YOUTUBE_ACTOR:       ', process.env.APIFY_YOUTUBE_ACTOR      ? '✅ presente' : '❌ ausente');
  console.log('APIFY_ECOMMERCE_ACTOR:     ', process.env.APIFY_ECOMMERCE_ACTOR    ? '✅ presente' : '❌ ausente');
  console.log('');

  // ── Testes IA ─────────────────────────────────────────────────────────────────
  console.log('--- Testes de conectividade: IA ---');
  await test('Gemini', async () => {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'diga oi' }] }] })
    });
    const d = await r.json() as any;
    if (!r.ok) throw new Error(`${r.status}: ${JSON.stringify(d)}`);
    return d.candidates[0].content.parts[0].text;
  });

  await test('Anthropic', async () => {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 10, messages: [{ role: 'user', content: 'diga oi' }] })
    });
    const d = await r.json() as any;
    if (!r.ok) throw new Error(`${r.status}: ${JSON.stringify(d)}`);
    return d.content[0].text;
  });

  await test('OpenAI', async () => {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 10, messages: [{ role: 'user', content: 'diga oi' }] })
    });
    const d = await r.json() as any;
    if (!r.ok) throw new Error(`${r.status}: ${JSON.stringify(d)}`);
    return d.choices[0].message.content;
  });

  // ── Testes Apify ──────────────────────────────────────────────────────────────
  console.log('\n--- Testes de conectividade: Apify ---');
  await test('Apify (APIFY_TOKEN)', async () => {
    const token = process.env.APIFY_TOKEN;
    if (!token) throw new Error('APIFY_TOKEN não definida');
    const r = await fetch(`https://api.apify.com/v2/users/me?token=${token}`);
    const d = await r.json() as any;
    if (!r.ok) throw new Error(`${r.status}: ${JSON.stringify(d).slice(0, 120)}`);
    return `userId=${d.data?.id ?? '?'} plan=${d.data?.plan?.id ?? '?'}`;
  });

  console.log('\n=== FIM ===\n');
}

main();
