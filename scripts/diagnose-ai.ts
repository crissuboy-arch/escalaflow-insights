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
  console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '✅ presente' : '❌ ausente');
  console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? '✅ presente' : '❌ ausente');
  console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ presente' : '❌ ausente');
  console.log('');

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
      body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 10, messages: [{ role: 'user', content: 'diga oi' }] })
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

  console.log('\n=== FIM ===\n');
}

main();
