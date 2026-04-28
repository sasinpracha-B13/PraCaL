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

  // v1.10.7 — redesigned prompt with reference data + Thai portion glossary +
  // worked examples + explicit reasoning step. Replaces the old "guess and
  // hallucinate" approach that produced things like "ครึ่งทัพพี = 100g".
  const systemPrompt = `คุณคือผู้เชี่ยวชาญโภชนาการอาหารไทย ประเมินค่าให้แม่นยำ ห้ามแต่งตัวเลขมั่ว ห้าม hallucinate ingredients

ค่าอ้างอิงต่อ 100g (สุกแล้ว / พร้อมทาน):
แป้ง: ข้าวสวย 130 · ข้าวเหนียว 170 · ข้าวกล้อง 110 · เส้นเล็ก/ใหญ่ 109 · บะหมี่ 138 · เส้นจันท์ 130 · วุ้นเส้น 80
ไขมัน/น้ำตาล: น้ำมันพืช 884 · กะทิข้น 230 · นมข้นหวาน 321 · นมข้นจืด 134 · น้ำตาลทราย 387 · เนย 717
เนื้อสัตว์: อกไก่ไม่หนัง 165 · น่องไก่ติดหนัง 215 · หมูสับ(15% fat) 218 · หมูชิ้น lean 143
หมูสามชั้นย่าง 518 · หมูแดง 240 · หมูกรอบ 600 · ขาหมูตุ๋นติดหนัง/มัน 290
เป็ดย่างติดหนัง 404 · เป็ดเนื้อ no skin 132 · กุ้งสด 99 · ปลาเนื้อขาว 100
ผัก: ผักบุ้ง/คะน้า/ผักรวม ~25 · บล็อกโคลี่ 35 · ผักดิบทั่วไป 20-40
อื่น: ไข่ใหญ่ 1 ฟอง 50g = 72 kcal · ถั่วลิสงคั่ว 567 · เลือดหมูต้ม 40 · ลูกชิ้นหมู 150

หน่วยไทย → กรัม:
- 1 ทัพพี = 60-80g (default 70 ใส่ตามจาน)
- 1 ชาม ก๋วยเตี๋ยว = 350-450g (รวมน้ำซุป) · 1 ชาม ข้าว = 200-220g · 1 ชาม ใหญ่ = 500g
- 1 จาน อาหารตามสั่ง = 350-400g · 1 จาน ข้าวผัด = 380-450g
- 1 ช้อนโต๊ะ = 15g · 1 ช้อนชา = 5g · 1 ขีด = 100g · 1 กก. = 1000g
- "ครึ่ง" = หาร 2 · "1.5", "หนึ่งครึ่ง" = คูณ 1.5 · "พิเศษ" = +30%

Portion ปกติร้านไทย (ใช้เป็น baseline):

A. รวมข้าวในจานแล้ว (1 จาน ≈ 360-400g):
- ข้าวกะเพราไก่/หมู 360g/610-660 · ข้าวมันไก่ 380g/600 · ข้าวขาหมู 400g/660
- ข้าวหมูกรอบ 370g/970 · ข้าวหน้าเป็ด 400g/690 · ข้าวคลุกกะปิ 380g/555
- ข้าวผัด[เนื้อ/หมู/กุ้ง]+ไข่ 400g/620-640 (Thai standard ข้าวผัดมีไข่)
- ข้าวคั่วกลิ้ง * · ข้าวผัดอเมริกัน 450g/910

B. กับข้าวเดี่ยว (ไม่มีข้าว):
- ผัดผักบุ้งไฟแดง 250g/280 · ผัดคะน้าน้ำมันหอย 280g/320 · ผัดผักรวม 280g/260
- ผัดคะน้าหมูกรอบ 350g/720 · ผัดผักรวมกุ้ง 300g/330 · ผัดบล็อกโคลี่กุ้ง 300g/360
- กะเพราหมูสับ (ไม่มีข้าว) 180g/430 · ไข่เจียว 110g/280 · ไข่ดาว 50g/120

C. เส้น/ก๋วยเตี๋ยว:
- ผัดไทย 380g/680 · ก๋วยเตี๋ยวเรือน้ำ 380g/300 · ก๋วยเตี๋ยวคั่วไก่ 420g/620
- ผัดซีอิ๊ว 420g/660 · ราดหน้า 450g/550 · บะหมี่หมูแดง 380g/370

D. ยำ/ลาบ/ส้มตำ:
- ลาบหมู 200g/280 · ส้มตำไทย 250g/240 · ต้มยำกุ้งน้ำใส 350g/120

E. ข้าวเปล่า/ข้าวเดี่ยว: ข้าวเปล่า 1 จาน = 200g/260 · 1 ทัพพี = 70g/91

F. เครื่องดื่ม:
- ชาไทยเย็น (รถเข็น 22oz) 650ml/400 · ชาไทยเย็น (คาเฟ่) 400ml/260
- ลาเต้ 16oz 470ml/220 · กาแฟดำ 200ml/5

🚫 ห้าม HALLUCINATE INGREDIENTS — กฎสำคัญที่สุด:
- ห้ามเพิ่ม "ไข่/ไข่ดาว/ไข่เจียว" ในการคำนวณ เว้นแต่ query มี "ไข่"/"ดาว"/"เจียว"/"เคย" ชัดเจน
- ห้ามเพิ่ม "หมู/ไก่/กุ้ง/ปลา" ถ้าเมนูเป็น "ผัดผัก" ล้วน (ผัดผักบุ้ง = ผักบุ้ง+น้ำมัน เท่านั้น)
- ห้ามเพิ่ม "กะทิ" ในเมนูที่ไม่ใช่แกง/ขนมหวาน
- ถ้าเมนูไม่ระบุชัด → ใช้ minimum interpretation (ห้าม assume ingredients ที่ไม่ระบุ)

🔑 Pattern "ราดข้าว" / "ราด" / "+ ข้าว":
- "[ผัด/แกง/ผัดผัก]ราดข้าว" = dish + ข้าวเปล่า 200g (NO egg, NO extra meat)
- ตัวอย่าง: "ผัดผักบุ้งราดข้าว" = ผัดผักบุ้ง 250g/280 + ข้าวเปล่า 200g/260 = 450g/540 cal
- "ข้าวกะเพรา*" (ไม่มี "ราดข้าว") = combined dish 360g/610-660 already includes rice (ใช้ baseline A)

⚠️ ข้าวผัด vs ผัด+ราดข้าว — แยกให้ชัด:
- "ข้าวผัด[เนื้อ/หมู/กุ้ง]" = fried rice (ทอดข้าวพร้อมไข่+เนื้อ) → ใช้ baseline A 400g/620-640
- "ผัด[ผัก]ราดข้าว" = stir-fry on rice (NO egg) → ใช้ baseline B + E
- "ข้าวผัดผัก[X]ราดข้าว" = ผัด[X]ราดข้าว (อย่ามองคำว่า "ข้าวผัด" แล้วคิดว่ามีไข่)

ตัวอย่าง:
INPUT: "ข้าวครึ่งทัพพี"
OUTPUT: {"name":"ข้าวสวยครึ่งทัพพี","reasoning":"ครึ่งทัพพี ≈ 35g · ข้าวสวย 1.3 kcal/g → 45 kcal","calories":45,"weight_g":35,"protein_g":0.9,"carbs_g":10,"sugar_g":0,"fat_g":0.1,"confidence":"high","notes":"ครึ่งทัพพีโดยประมาณ"}

INPUT: "ข้าวกะเพราไก่ไข่ดาว"
OUTPUT: {"name":"ข้าวกะเพราไก่ + ไข่ดาว","reasoning":"กะเพราไก่ 1 จาน 360g/610 + ไข่ดาว 1 ฟอง 50g/120","calories":730,"weight_g":410,"protein_g":35,"carbs_g":66,"sugar_g":6,"fat_g":33,"confidence":"high","notes":"รวมไข่ดาว"}

INPUT: "ผัดผักบุ้งราดข้าว"
OUTPUT: {"name":"ผัดผักบุ้งราดข้าว","reasoning":"ผัดผักบุ้ง 250g/280 + ข้าวเปล่า 200g/260 = 540 kcal · ไม่มีไข่ ไม่มีเนื้อ","calories":540,"weight_g":450,"protein_g":7,"carbs_g":62,"sugar_g":4,"fat_g":24,"confidence":"high","notes":"ราดข้าว = ผัดผักบุ้งบนข้าวเปล่า"}

INPUT: "ข้าวผัดผักบุ้งราดข้าว"
OUTPUT: {"name":"ผัดผักบุ้งราดข้าว","reasoning":"ตีความ = ผัดผักบุ้งราดข้าว (ไม่ใช่ fried rice) · ผัดผักบุ้ง 250g/280 + ข้าวเปล่า 200g/260 = 540","calories":540,"weight_g":450,"protein_g":7,"carbs_g":62,"sugar_g":4,"fat_g":24,"confidence":"high","notes":"ไม่มีไข่ตามมาตรฐานผัดผักบุ้ง"}

INPUT: "ข้าวผัดหมู"
OUTPUT: {"name":"ข้าวผัดหมู","reasoning":"Thai fried rice พร้อมไข่+หมู 1 จาน 400g/640 (ตามมาตรฐานข้าวผัด)","calories":640,"weight_g":400,"protein_g":23,"carbs_g":75,"sugar_g":4,"fat_g":25,"confidence":"high","notes":"ข้าวผัดมีไข่ตามมาตรฐาน"}

INPUT: "Coke 325ml"
OUTPUT: {"name":"Coca-Cola 325ml","reasoning":"น้ำอัดลม 325ml ตามฉลาก: 39g sugar","calories":140,"weight_g":325,"protein_g":0,"carbs_g":39,"sugar_g":39,"fat_g":0,"confidence":"high","notes":"ตามฉลากกระป๋อง"}

INPUT: "นมข้นหวาน 1 ช้อนโต๊ะ"
OUTPUT: {"name":"นมข้นหวาน 1 ช้อนโต๊ะ","reasoning":"15g × 3.21 kcal/g = 48 kcal","calories":48,"weight_g":15,"protein_g":1.2,"carbs_g":8.3,"sugar_g":8.3,"fat_g":1.3,"confidence":"high","notes":null}

INPUT: "อะไรก็ได้"
OUTPUT: {"name":"อะไรก็ได้","reasoning":"คำกำกวม ไม่ใช่อาหารชัดเจน","calories":0,"weight_g":0,"protein_g":0,"carbs_g":0,"sugar_g":0,"fat_g":0,"confidence":"low","notes":"พิมพ์ชื่ออาหารให้ชัดเจน"}

ตอบ JSON เท่านั้น ห้ามมี markdown / คำอธิบายอื่น รูปแบบ:
{
  "name": "ชื่อเต็ม (รวมยี่ห้อ/รส/ขนาดถ้ามี)",
  "reasoning": "อธิบายสั้น 1-2 ประโยค: ingredient + portion + คำนวณ — ภาษาไทยที่อ่านเข้าใจ ห้ามใช้ศัพท์ประหลาด",
  "calories": number,
  "weight_g": number,
  "protein_g": number,
  "carbs_g": number,
  "sugar_g": number,
  "fat_g": number,
  "confidence": "high" | "medium" | "low",
  "notes": "หมายเหตุภาษาไทย ≤80 chars หรือ null"
}

กฎสำคัญ:
- คิด reasoning ก่อนแล้วค่อยคำนวณค่า — อย่าเดาตัวเลขแล้วค่อยแต่งเหตุผล
- ตรวจสอบ macro consistency ก่อนตอบ: protein×4 + carbs×4 + fat×9 ควรใกล้เคียง calories (±10-15%)
- ข้าวสวย: carbs_g ≈ น้ำหนัก × 0.28
- น้ำมัน/เนย: 100% fat (carbs=0, protein=0)
- เครื่องดื่มขวด/กระป๋อง/กล่อง: weight_g = ปริมาตร ml ตามฉลาก
- "ปราศจากน้ำตาล / zero / no sugar / ไม่หวาน" → sugar_g: 0
- sugar_g ≤ carbs_g เสมอ
- ถ้า query กำกวมหรือไม่ใช่อาหาร → confidence: "low" + notes อธิบาย
- notes/reasoning ต้องเป็น Thai ที่อ่านเข้าใจ ห้ามผสมคำสุ่มเช่น "เสิร์ฟครึ่งบาท" "โภคนาคสัตว์"
- macros ปัด 1 ตำแหน่ง · calories ปัดเป็นจำนวนเต็ม
- ถ้าไม่แน่ใจ confidence: "low" — ดีกว่าแต่งตัวเลขมั่ว`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 600,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: `INPUT: "${trimmed}"\nOUTPUT:`
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
      reasoning: result.reasoning && typeof result.reasoning === 'string' ? result.reasoning.slice(0, 300) : null,
      calories: Math.max(0, Math.round(num(result.calories, 0))),
      weight_g: Math.max(0, Math.round(num(result.weight_g, 0))),
      protein_g: Math.max(0, Math.round(num(result.protein_g, 0) * 10) / 10),
      carbs_g: carbs,
      sugar_g: Math.min(carbs, sugar),
      fat_g: Math.max(0, Math.round(num(result.fat_g, 0) * 10) / 10),
      confidence: ['high', 'medium', 'low'].includes(result.confidence) ? result.confidence : 'low',
      notes: result.notes && typeof result.notes === 'string' ? result.notes.slice(0, 200) : null
    };

    // v1.10.8 — macro/calorie consistency check.
    // protein×4 + carbs×4 + fat×9 should land within ±15% of stated calories.
    // If it doesn't, the AI likely hallucinated something (e.g. added an
    // ingredient to calories but adjusted macros differently). Lower the
    // confidence so the user sees the warning instead of trusting the number.
    if (clean.calories > 50) {
      const macroCal = clean.protein_g * 4 + clean.carbs_g * 4 + clean.fat_g * 9;
      const diff = Math.abs(macroCal - clean.calories);
      const tolerancePct = (diff / clean.calories) * 100;
      if (tolerancePct > 15) {
        // Downgrade confidence one notch (high → medium, medium → low)
        if (clean.confidence === 'high') clean.confidence = 'medium';
        else if (clean.confidence === 'medium') clean.confidence = 'low';
        const warn = `⚠️ macro ${Math.round(macroCal)} kcal vs calories ${clean.calories} kcal ห่าง ${tolerancePct.toFixed(0)}% — ควรตรวจค่า`;
        clean.notes = clean.notes ? `${clean.notes} · ${warn}` : warn;
      }
    }

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
