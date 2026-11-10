export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const userMessage = req.body.message || '';
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        // 1. ยิงไปหา Gemini API
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    role: 'user',
                    parts: [{
                        text: `คุณคือ น้องแบด ผู้ช่วยตอบคำถามประจำสนามแบดมินตัน ศูนย์เยาวชนกรุงเทพมหานคร (ไทย-ญี่ปุ่น) เขตดินแดง ตอบสั้นกระชับ: ${userMessage}`
                    }]
                }]
            })
        });

        const data = await response.json();
        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'ขออภัย ไม่สามารถดึงข้อมูลได้';

        // 2. ส่งกลับในโครงสร้าง Response ที่ Botnoi นำไปพ่นลง LINE ได้ทันที
        return res.status(200).json({
            messages: [
                {
                    type: "text",
                    text: replyText
                }
            ]
        });
    } catch (error) {
        return res.status(500).json({
            messages: [
                {
                    type: "text",
                    text: "เกิดข้อผิดพลาดในการเชื่อมต่อ AI"
                }
            ]
        });
    }
}
