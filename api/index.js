export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const events = req.body.events || [];
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        const LINE_ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN;

        for (let event of events) {
            // รับเฉพาะข้อความตัวหนังสือจาก LINE
            if (event.type === 'message' && event.message.type === 'text') {
                const userMessage = event.message.text;
                const replyToken = event.replyToken;

                // 1. ยิงข้อความไปประมวลผลที่ Gemini
                const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            role: 'user',
                            parts: [{
                                text: `คุณคือ น้องแบด ผู้ช่วยตอบคำถามประจำสนามแบดมินตัน ศูนย์เยาวชนกรุงเทพมหานคร (ไทย-ญี่ปุ่น) เขตดินแดง จงตอบคำถามสั้นกระชับ สุภาพ เป็นกันเอง: ${userMessage}`
                            }]
                        }]
                    })
                });

                const geminiData = await geminiRes.json();
                const replyText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'ขออภัย ไม่สามารถดึงข้อมูลได้';

                // 2. ตอบกลับข้อความเพียวๆ เข้า LINE โดยตรงผ่าน Reply Token
                if (replyToken && LINE_ACCESS_TOKEN) {
                    await fetch('https://api.line.me/v2/bot/message/reply', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`
                        },
                        body: JSON.stringify({
                            replyToken: replyToken,
                            messages: [{ type: 'text', text: replyText }]
                        })
                    });
                }
            }
        }

        return res.status(200).json({ status: 'success' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
}
