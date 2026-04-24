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
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `ประเมินอาหาร/เครื่องดื่ม: "${trimmed}"

ตอบเฉพาะ JSON ไม่ต้อง markdown ไม่ต้องคำอธิบายอื่น:
{
  "name": "ชื่อเต็ม (รวมยี่ห้อและรสถ้ามี)",
  "calories": number,
  "weight_g": number,
  "protein_g": number,
  "carbs_g": number,
  "sugar_g": number,
  "fat_g": number,
  "confidence": "high" | "medium" | "low",
  "notes": "หมายเหตุสั้น (ปริมาตร ขนาด ยี่ห้อ) หรือ null"
}

หลักการขนาด 1 เสิร์ฟ:
- เครื่องดื่มในขวด/กระป๋อง/กล่อง: ใช้ปริมาตรตามฉลาก (เช่น 240ml, 325ml, 340ml, 480ml) และใส่ weight_g = ปริมาตร ml
- อาหารบรรจุภัณฑ์ (มาม่า ขนมห่อ โยเกิร์ต): ใช้ 1 ซอง/ถ้วยตามฉลาก
- อาหารจานเดียว: serving ปกติในไทย 1 จาน หรือ 1 ชาม
- ผลไม้: 1 ลูก หรือ 1 ถ้วย
- ถ้าผู้ใช้ระบุจำนวนเช่น "2 ขวด" ให้คำนวณรวม

Confidence:
- high: รู้จักยี่ห้อ+สูตรชัดเจน หรืออาหารมาตรฐานที่ค่าคงที่
- medium: รู้ชนิดแต่ยี่ห้อ/สูตรหลากหลาย ใช้ค่าประมาณ
- low: คลุมเครือ ไม่ใช่อาหาร หรือข้อมูลไม่พอ

กฎสำคัญ:
- sugar_g ต้อง ≤ carbs_g เสมอ
- ถ้าสินค้าระบุ "no sugar / zero sugar / ไม่มีน้ำตาล / ปราศจากน้ำตาล" → sugar_g: 0
- โปรตีนสูงจริง (high protein drinks ยี่ห้อที่ระบุ 30g+) ให้ใช้ค่าจริงจากฉลาก
- ใส่ notes ให้ใช้: ปริมาตร/ขนาดบรรจุ หรือข้อควรรู้เช่น "ใส่น้ำตาลเพิ่มได้"`
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
    const carbs = Math.max(0, Math.round(num(result.carbs_g, 0) * 10) / 10);
    const sugar = Math.max(0, Math.round(num(result.sugar_g, 0) * 10) / 10);
    const clean = {
      name: String(result.name || trimmed).slice(0, 80),
      calories: Math.max(0, Math.round(num(result.calories, 0))),
      weight_g: Math.max(0, Math.round(num(result.weight_g, 0))),
      protein_g: Math.max(0, Math.round(num(result.protein_g, 0) * 10) / 10),
      carbs_g: carbs,
      sugar_g: Math.min(carbs, sugar),
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
