export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const userMessage = req.body.message || '';
        const userId = req.body.userId || req.body.user_id || ''; // รับ LINE User ID จาก Botnoi
        
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        const LINE_ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN; // Channel Access Token จาก LINE

        // 1. ยิงหา Gemini API
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

        // 2. ถ้ามี userId ให้ยิง Push Message เข้า LINE โดยตรง
        if (userId && LINE_ACCESS_TOKEN) {
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

        // ส่ง Status 200 กลับไปให้ Botnoi เงียบๆ
        return res.status(200).json({ status: "success" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
}
