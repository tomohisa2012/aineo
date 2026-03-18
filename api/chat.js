export default async function handler(req, res) {
  try {
    // POST以外ブロック
    if (req.method !== "POST") {
      return res.status(405).json({ reply: "POST only" });
    }

    const { messages } = req.body || {};

    if (!messages) {
      return res.status(400).json({ reply: "messagesが空" });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ reply: "APIキー未設定" });
    }

    const apiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages
      })
    });

    // 👇 ここ超重要（エラーでもJSON化する）
    const text = await apiRes.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(500).json({
        reply: "Groqの返答が壊れてる",
        raw: text
      });
    }

    if (!apiRes.ok) {
      return res.status(500).json({
        reply: "Groqエラー",
        error: data
      });
    }

    if (!data.choices) {
      return res.status(500).json({
        reply: "choicesがない",
        data
      });
    }

    return res.status(200).json({
      reply: data.choices[0].message.content
    });

  } catch (err) {
    return res.status(500).json({
      reply: "サーバークラッシュ",
      error: err.message
    });
  }
}
