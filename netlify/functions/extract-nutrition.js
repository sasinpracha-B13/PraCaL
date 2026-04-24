exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let imageBase64, barcode;
  try {
    ({ imageBase64, barcode } = JSON.parse(event.body || '{}'));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'คำขอไม่ถูกต้อง' }) };
  }

  if (!imageBase64 || typeof imageBase64 !== 'string' || imageBase64.length < 100) {
    return { statusCode: 400, body: JSON.stringify({ error: 'ไม่พบรูปภาพ' }) };
  }

  if (imageBase64.length > 5_000_000) {
    return { statusCode: 413, body: JSON.stringify({ error: 'รูปใหญ่เกินไป ลองถ่ายใหม่' }) };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'ยังไม่ได้ตั้งค่า API key บนเซิร์ฟเวอร์' }) };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 700,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 }
            },
            {
              type: 'text',
              text: `อ่านข้อมูลจากรูปบรรจุภัณฑ์หรือ nutrition label นี้

ส่งกลับ JSON เท่านั้น ไม่มี markdown ไม่มีข้อความอื่น:

{
  "productName": "ชื่อสินค้าภาษาไทย (ถ้ามี) หรือภาษาอังกฤษ",
  "brand": "แบรนด์ผู้ผลิต ถ้าเห็น หรือ null",
  "category": "protein_drinks" | "milk_drinks" | "coffee_drinks" | "packaged_drinks" | "yogurt" | "convenience" | "snacks" | "bakery" | "other",
  "servingSize": number,
  "servingUnit": "ml" | "g",
  "servingsPerPackage": number,
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "sugar_g": number,
  "fat_g": number,
  "sodium_mg": number,
  "confidence": "high" | "medium" | "low",
  "notes": "หมายเหตุสั้น ถ้ามี หรือ null"
}

กฎสำคัญ:
- ถ้าเห็นทั้ง "ต่อ 100g" และ "ต่อ 1 เสิร์ฟ" → ใช้ต่อ 1 เสิร์ฟ
- ถ้าเครื่องดื่ม: servingUnit = "ml", servingSize = ปริมาตรต่อ 1 หน่วยบริโภค
- ถ้าอาหาร: servingUnit = "g"
- sugar_g ≤ carbs_g เสมอ
- ถ้าสินค้าระบุ "no sugar / zero sugar / ไม่มีน้ำตาล" → sugar_g: 0
- ถ้าอ่านไม่ชัดหรือไม่แน่ใจ → confidence: "low"
- ถ้ารูปไม่ใช่อาหาร/เครื่องดื่ม ให้ยังส่ง JSON แต่ confidence: "low" และ notes อธิบายว่ารูปนี้ไม่ใช่อาหาร
- ถ้าไม่มีข้อมูล sodium ให้ใส่ 0
- servingsPerPackage: ถ้าไม่เห็นชัดให้ใส่ 1
- ตัวเลขปัดเศษเป็นทศนิยม 1 ตำแหน่ง`
            }
          ]
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
        body: JSON.stringify({ error: 'รูปแบบคำตอบไม่ถูกต้อง', raw: text.slice(0, 300) })
      };
    }

    const result = JSON.parse(jsonMatch[0]);

    const num = (v, fallback) => (typeof v === 'number' && isFinite(v) ? v : fallback);
    const carbs = Math.max(0, Math.round(num(result.carbs_g, 0) * 10) / 10);
    const sugar = Math.max(0, Math.round(num(result.sugar_g, 0) * 10) / 10);
    const validUnits = ['ml', 'g'];
    const validCats = ['protein_drinks','milk_drinks','coffee_drinks','packaged_drinks','yogurt','convenience','snacks','bakery','other'];

    const clean = {
      productName: String(result.productName || 'ไม่ระบุชื่อ').slice(0, 100),
      brand: result.brand ? String(result.brand).slice(0, 60) : null,
      category: validCats.includes(result.category) ? result.category : 'other',
      servingSize: Math.max(1, Math.round(num(result.servingSize, 100))),
      servingUnit: validUnits.includes(result.servingUnit) ? result.servingUnit : 'g',
      servingsPerPackage: Math.max(1, Math.round(num(result.servingsPerPackage, 1))),
      calories: Math.max(0, Math.round(num(result.calories, 0))),
      protein_g: Math.max(0, Math.round(num(result.protein_g, 0) * 10) / 10),
      carbs_g: carbs,
      sugar_g: Math.min(carbs, sugar),
      fat_g: Math.max(0, Math.round(num(result.fat_g, 0) * 10) / 10),
      sodium_mg: Math.max(0, Math.round(num(result.sodium_mg, 0))),
      confidence: ['high', 'medium', 'low'].includes(result.confidence) ? result.confidence : 'low',
      notes: result.notes && typeof result.notes === 'string' ? result.notes.slice(0, 200) : null,
      barcode: barcode && typeof barcode === 'string' ? barcode.slice(0, 30) : null
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
        error: 'อ่านข้อมูลไม่สำเร็จ กรุณาถ่ายใหม่ให้ชัดขึ้น',
        detail: error.message
      })
    };
  }
};
