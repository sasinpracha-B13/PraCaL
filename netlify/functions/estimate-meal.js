exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  let mealName;
  try {
    ({ mealName } = JSON.parse(event.body || '{}'));
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'คำขอไม่ถูกต้อง' })
    };
  }

  if (!mealName || typeof mealName !== 'string' || mealName.trim().length < 2) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'กรุณาพิมพ์ชื่อเมนู' })
    };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'ยังไม่ได้ตั้งค่า API key บนเซิร์ฟเวอร์' })
    };
  }

  const trimmed = mealName.trim().slice(0, 120);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: `ประเมินอาหารไทย: "${trimmed}"

ตอบเฉพาะ JSON format ไม่ต้องมีข้อความอื่น ไม่ต้องมี markdown:
{
  "name": "ชื่อเมนูที่ถูกต้อง",
  "calories": number,
  "weight_g": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "confidence": "high" | "medium" | "low",
  "notes": "หมายเหตุสั้นๆ ถ้ามี หรือ null"
}

ใช้ขนาด serving ปกติในไทย (1 จาน / 1 ชาม)
ถ้าอาหารคลุมเครือหรือไม่ใช่อาหาร → confidence: "low"
ถ้าไม่ใช่อาหารไทยแต่เป็นอาหารที่รู้จัก → confidence: "medium"`
        }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        statusCode: 502,
        body: JSON.stringify({
          error: 'เรียก AI ไม่สำเร็จ',
          detail: `status ${response.status}: ${errText.slice(0, 200)}`
        })
      };
    }

    const data = await response.json();
    const text = data?.content?.[0]?.text || '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        statusCode: 502,
        body: JSON.stringify({ error: 'รูปแบบคำตอบไม่ถูกต้อง', raw: text.slice(0, 200) })
      };
    }

    const result = JSON.parse(jsonMatch[0]);

    const num = (v, fallback) => (typeof v === 'number' && isFinite(v) ? v : fallback);
    const clean = {
      name: String(result.name || trimmed).slice(0, 80),
      calories: Math.max(0, Math.round(num(result.calories, 0))),
      weight_g: Math.max(0, Math.round(num(result.weight_g, 0))),
      protein_g: Math.max(0, Math.round(num(result.protein_g, 0) * 10) / 10),
      carbs_g: Math.max(0, Math.round(num(result.carbs_g, 0) * 10) / 10),
      fat_g: Math.max(0, Math.round(num(result.fat_g, 0) * 10) / 10),
      confidence: ['high', 'medium', 'low'].includes(result.confidence) ? result.confidence : 'low',
      notes: result.notes && typeof result.notes === 'string' ? result.notes.slice(0, 200) : null
    };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(clean)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'ไม่สามารถประเมินได้ กรุณาลองใหม่',
        detail: error.message
      })
    };
  }
};
