export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ reply: "POST only" });
    }

    const { messages } = req.body;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: messages
      })
    });

    const text = await response.text();
    console.log("Groq raw:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(500).json({
        reply: "JSON変換失敗：" + text
      });
    }

    if (!response.ok) {
      return res.status(500).json({
        reply: "Groqエラー：" + (data.error?.message || text)
      });
    }

    return res.status(200).json({
      reply: data.choices?.[0]?.message?.content || "返答なし"
    });

  } catch (e) {
    return res.status(500).json({
      reply: "サーバーエラー：" + e.message
    });
  }
}
