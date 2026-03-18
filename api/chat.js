export default async function handler(req, res) {
  try {
    const { messages } = req.body;
    const userMessage = messages[messages.length - 1].content;

    // 🔥 検索が必要か判定
    const needSearch =
      userMessage.includes("とは") ||
      userMessage.includes("誰") ||
      userMessage.includes("何") ||
      userMessage.includes("教えて") ||
      userMessage.includes("スタンド");

    let wikiText = "";

    if (needSearch) {
      // Wikipedia検索
      const searchRes = await fetch(
        "https://ja.wikipedia.org/w/api.php?action=query&list=search&srsearch=" +
        encodeURIComponent(userMessage) +
        "&format=json&origin=*"
      );

      const searchData = await searchRes.json();
      const firstResult = searchData.query.search[0];

      if (firstResult) {
        const pageRes = await fetch(
          "https://ja.wikipedia.org/api/rest_v1/page/summary/" +
          encodeURIComponent(firstResult.title)
        );

        if (pageRes.ok) {
          const pageData = await pageRes.json();
          wikiText = pageData.extract || "";
        }
      }
    }

    // 🔥 システム指示（ここが超重要）
    const systemPrompt = `
あなたは自然に会話できるAIです。

【ルール】
・普段は普通に会話してください
・しりとりなどの遊びは絶対に優先すること
・不自然に解説しないこと

【検索モード】
・以下の情報がある場合だけ参考にする
・無い場合は普通に答える

【参考情報】
${wikiText}
`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ]
      })
    });

    const data = await response.json();

    return res.status(200).json({
      reply: data.choices?.[0]?.message?.content || "うまく答えられなかった"
    });

  } catch (e) {
    return res.status(500).json({
      reply: "エラー：" + e.message
    });
  }
}
