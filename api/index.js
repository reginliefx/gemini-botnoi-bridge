const { Client } = require('@line/bot-sdk');

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new Client(config);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const events = req.body.events || [];

  for (let event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const userMessage = event.message.text;
      const replyToken = event.replyToken;

      try {
        // 1. ลองยิงถาม Botnoi ก่อนว่าตรงกับ Intent/Wake Word ไหม
        const botnoiResponse = await fetch('https://agentic.botnoi.ai/api/v1/chat', { // เปลี่ยนเป็น Endpoint Chat API ของ Botnoi
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.BOTNOI_API_KEY}`
          },
          body: JSON.stringify({ message: userMessage })
        });

        const botnoiData = await botnoiResponse.json();

        // 2. ถ้า Botnoi มีคำตอบ (ตรงกับ Wake Word เช่น กฎระเบียบ, เวลาบริการ, กิจกรรม)
        if (botnoiData && botnoiData.response && !botnoiData.is_fallback) {
          await client.replyMessage(replyToken, {
            type: 'text',
            text: botnoiData.response
          });
        } 
        // 3. ถ้าหลุด Fallback (ไม่มีใน Wake Word) -> ให้ Gemini ตอบ
        else {
          const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`, {
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

          const geminiData = await geminiRes.json();
          const replyText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'ขออภัย ไม่สามารถดึงข้อมูลได้';

          // ส่งคำตอบ Gemini กลับเข้า LINE
          await client.replyMessage(replyToken, {
            type: 'text',
            text: replyText
          });
        }
      } catch (err) {
        console.error(err);
      }
    }
  }

  return res.status(200).json({ status: 'success' });
}
