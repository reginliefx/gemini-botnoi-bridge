export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // ตอบ 200 OK ให้ LINE ทันที
    res.status(200).json({ status: 'ok' });

    try {
        const events = req.body.events || [];
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        const LINE_ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN;
        const BOTNOI_WEBHOOK_URL = "https://api-gateway.botnoi.ai/webhook/6add686065be26cc9e92b1ba/line";

        for (let event of events) {
            if (event.type === 'message' && event.message.type === 'text') {
                const userMessage = event.message.text;
                const userId = event.source.userId;

                // 1. ส่ง Forward ทุกลิงก์/ทุกคำตอบ ไปให้ Botnoi ประมวลผลก่อน (Rich Menu + Wake Word จะทำงาน 100%)
                await fetch(BOTNOI_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(req.body)
                });

                // 2. ถ้าเป็นคำถามทั่วไป (ไม่ใช่คำสั่งสั้นๆ ของ Wake Word) ให้ Gemini ช่วยตอบ Push เข้า LINE
                // รายชื่อ Wake Word หลักที่เซ็ตใน Botnoi เพื่อไม่ให้ Gemini ตอบซ้ำ
                const isWakeWord = ["ที่ตั้ง", "กิจกรรม", "เวลาบริการ", "กฎระเบียบ", "ข้อมูลเบื้องต้น"].some(keyword => userMessage.includes(keyword));

                if (!isWakeWord && GEMINI_API_KEY && LINE_ACCESS_TOKEN && userId) {
                    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{
                                role: 'user',
                                parts: [{
                                    text: `คุณคือ น้องแบด ผู้ช่วยตอบคำถามประจำสนามแบดมินตัน ศูนย์เยาวชนกรุงเทพมหานคร (ไทย-ญี่ปุ่น) เขตดินแดง ตอบสั้นกระชับ สุภาพ: ${userMessage}`
                                }]
                            }]
                        })
                    });

                    const geminiData = await geminiRes.json();
                    const replyText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

                    if (replyText) {
                        await fetch('https://api.line.me/v2/bot/message/push', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`
                            },
                            body: JSON.stringify({
                                to: userId,
                                messages: [{ type: 'text', text: replyText }]
                            })
                        });
                    }
                }
            }
        }
    } catch (error) {
        console.error('Proxy Error:', error);
    }
}
