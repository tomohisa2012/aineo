export default async function handler(req, res) {
  try {
    const { messages } = req.body;
    const userMessage = messages[messages.length - 1].content;

    // ① Wikipedia検索（ちゃんと検索する）
    const searchRes = await fetch(
      "https://ja.wikipedia.org/w/api.php?action=query&list=search&srsearch=" +
      encodeURIComponent(userMessage) +
      "&format=json&origin=*"
    );

    const searchData = await searchRes.json();
    const firstResult = searchData.query.search[0];

    let wikiText = "";

    if (firstResult) {
      const title = firstResult.title;

      // ② 記事取得
      const pageRes = await fetch(
        "https://ja.wikipedia.org/api/rest_v1/page/summary/" +
        encodeURIComponent(title)
      );

      if (pageRes.ok) {
        const pageData = await pageRes.json();
        wikiText = pageData.extract || "";
      }
    }

    // ③ AIに「これ以外使うな」と強制
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
以下の情報だけを使って答えてください。
情報にないことは絶対に答えないでください。

【情報】
${wikiText}
`
          },
          {
            role: "user",
            content: userMessage
          }
        ]
      })
    });

    const data = await response.json();

    return res.status(200).json({
      reply: data.choices?.[0]?.message?.content || "分かりません"
    });

  } catch (e) {
    return res.status(500).json({
      reply: "エラー：" + e.message
    });
  }
}
