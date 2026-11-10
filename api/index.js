export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // ส่ง 200 ให้ LINE ก่อนทันทีเพื่อป้องกัน Timeout
    res.status(200).json({ status: 'ok' });

    try {
        const events = req.body.events || [];
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        const LINE_ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN;
        
        // URL Webhook ของ Botnoi
        const BOTNOI_WEBHOOK_URL = "https://api-gateway.botnoi.ai/webhook/6add686065be26cc9e92b1ba/line";

        for (let event of events) {
            if (event.type === 'message' && event.message.type === 'text') {
                const replyToken = event.replyToken;
                const userMessage = event.message.text;

                // 1. ส่งข้อความต่อไปให้ Botnoi ทำงานตามปกติ (พวก Intent กฎระเบียบ, กิจกรรม ฯลฯ)
                await fetch(BOTNOI_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(req.body)
                });
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
}
