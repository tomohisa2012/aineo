export default async function handler(req, res) {
  try {
    // POST以外は拒否
    if (req.method !== "POST") {
      return res.status(405).json({ reply: "POST only" });
    }

    const { messages } = req.body || {};

    // 入力チェック
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ reply: "messagesが不正" });
    }

    // APIキー確認
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ reply: "APIキー未設定（Vercel設定ミス）" });
    }

    // Groqにリクエスト
    const apiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: messages
      })
    });

    // 生テキスト取得（ここ重要）
    const text = await apiRes.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return res.status(500).json({
        reply: "Groqのレスポンスが壊れてる",
        raw: text
      });
    }

    // エラー処理
    if (!apiRes.ok) {
      return res.status(500).json({
        reply: "Groq APIエラー",
        error: data
      });
    }

    if (!data.choices || !data.choices[0]) {
      return res.status(500).json({
        reply: "AIの返答が取得できない",
        data: data
      });
    }

    // 成功
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
