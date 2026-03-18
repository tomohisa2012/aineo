export default async function handler(req, res) {
  try {
    const { messages } = req.body;
    const userMessage = messages[messages.length - 1].content;

    // ① Wikipedia検索
    const wikiRes = await fetch(
      "https://ja.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(userMessage)
    );

    let wikiText = "";
    if (wikiRes.ok) {
      const wikiData = await wikiRes.json();
      wikiText = wikiData.extract || "";
    }

    // ② AIに渡す
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `
以下の情報を必ず参考にして答えてください。
情報が足りない場合は「分かりません」と答えてください。

【参考情報】
${wikiText}
`
          },
          ...messages
        ]
      })
    });

    const data = await response.json();

    return res.status(200).json({
      reply: data.choices?.[0]?.message?.content || "返答なし"
    });

  } catch (e) {
    return res.status(500).json({
      reply: "エラー：" + e.message
    });
  }
}
