export default async function handler(req, res) {
  try {
    const { messages } = req.body;
    const userMessage = messages[messages.length - 1].content;

    // 🔍 検索判定
    const needSearch =
      userMessage.includes("とは") ||
      userMessage.includes("誰") ||
      userMessage.includes("何") ||
      userMessage.includes("教えて") ||
      userMessage.includes("スタンド");

    let wikiText = "";

    if (needSearch) {
      try {
        const searchRes = await fetch(
          "https://ja.wikipedia.org/w/api.php?action=query&list=search&srsearch=" +
          encodeURIComponent(userMessage) +
          "&format=json&origin=*"
        );

        const searchData = await searchRes.json();
        const firstResult = searchData?.query?.search?.[0];

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
      } catch (e) {
        console.log("Wikipedia取得失敗:", e);
      }
    }

    const systemPrompt = `
あなたは自然に会話できるAIです。

・普段は普通に会話
・しりとりなどの遊びは優先
・解説しすぎない

【参考情報】
${wikiText}
`;

    // 🔥 Groq呼び出し
    const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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

    // 👇 ここ重要（textで受ける）
    const text = await aiRes.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("AIレスポンスJSON変換失敗:", text);
      return res.status(500).json({
        reply: "AIの応答がおかしい（JSONじゃない）"
      });
    }

    return res.status(200).json({
      reply: data?.choices?.[0]?.message?.content || "うまく答えられなかった"
    });

  } catch (e) {
    console.error("サーバーエラー:", e);
    return res.status(500).json({
      reply: "サーバーエラー：" + e.message
    });
  }
}
