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

  // v1.10.7 — sharper OCR prompt with explicit reasoning step + better
  // per-100g vs per-serving handling + validation rules.
  const ocrPrompt = `อ่านข้อมูลโภชนาการจากรูปบรรจุภัณฑ์/ฉลาก แล้วตอบ JSON เท่านั้น

ขั้นตอนคิด (ใส่ใน reasoning):
1. ระบุประเภท (เครื่องดื่ม/อาหาร/ขนม) + ยี่ห้อ + รส/ขนาด
2. ดูว่าตารางโภชนาการเป็น "ต่อ 100g/ml" หรือ "ต่อ 1 หน่วยบริโภค" — ถ้ามีทั้งสอง ใช้ต่อ 1 เสิร์ฟ
3. ระบุ servingSize (ตัวเลข), servingUnit (ml/g)
4. คำนวณค่าต่อ 1 เสิร์ฟ ถ้าฉลากให้แต่ต่อ 100g

ตอบรูปแบบนี้:
{
  "reasoning": "อธิบายสั้น 1-2 ประโยค: ฉลากบอกว่าอะไร + ใช้ค่าไหน — ภาษาไทยอ่านเข้าใจ",
  "productName": "ชื่อสินค้า (ไทย/อังกฤษ)",
  "brand": "ยี่ห้อ หรือ null",
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
  "notes": "หมายเหตุสั้นภาษาไทย ≤100 chars หรือ null"
}

กฎสำคัญ:
- ถ้าเห็นทั้ง "ต่อ 100g" และ "ต่อ 1 เสิร์ฟ" → ใช้ค่าต่อ 1 เสิร์ฟ (ที่ผู้ใช้กินจริง)
- เครื่องดื่ม: servingUnit = "ml", servingSize = ปริมาตรต่อ 1 หน่วยบริโภค (ตามฉลาก)
- อาหาร/ขนม: servingUnit = "g"
- ปริมาตรเครื่องดื่มไทย common: 180ml, 240ml, 300ml, 325ml, 330ml, 480ml, 500ml
- sugar_g ≤ carbs_g เสมอ
- "ปราศจากน้ำตาล / zero sugar / no sugar / ไม่มีน้ำตาล / ไม่หวาน" → sugar_g: 0
- โปรตีนสูง (high protein drinks เช่น Sunshine, Vitaday) ใช้ค่าจริงจากฉลาก ไม่ลด
- ถ้าอ่านไม่ชัด/ไม่แน่ใจ → confidence: "low"
- ถ้ารูปไม่ใช่อาหาร/เครื่องดื่ม → ส่ง JSON แต่ confidence: "low" + notes อธิบาย
- ถ้าไม่มีข้อมูล sodium → 0
- servingsPerPackage: ถ้าไม่เห็นชัด → 1
- ค่าตัวเลขปัด 1 ตำแหน่ง (calories ปัดเต็ม · sodium ปัดเต็ม)
- reasoning/notes ห้ามใช้ศัพท์ประหลาด — Thai ปกติที่อ่านเข้าใจ

Validation (เช็คก่อนตอบ):
- น้ำเปล่า: calories ≈ 0
- น้ำอัดลม regular: sugar/carbs ratio ใกล้ 1:1, ~10g sugar/100ml
- นม whole: protein ~3g, fat ~3.5g, sugar ~5g per 100ml
- โยเกิร์ตหวาน: sugar 8-15g/100g typical
- ถ้าค่าผิดปกติเทียบหมวดหมู่ → confidence: "medium" หรือ "low"`;

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
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 }
            },
            {
              type: 'text',
              text: ocrPrompt
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
      reasoning: result.reasoning && typeof result.reasoning === 'string' ? result.reasoning.slice(0, 300) : null,
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
