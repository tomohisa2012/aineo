export default async function handler(req, res) {
  try {
    const { messages } = req.body;
    const userMessage = messages[messages.length - 1].content;

    // 🔥 会話かどうか判定（重要）
    const casual =
      userMessage.length < 10 &&
      !userMessage.includes("とは") &&
      !userMessage.includes("誰") &&
      !userMessage.includes("何");

    let infoText = "";

    // 🔍 必要なときだけ検索
    if (!casual) {
      try {
        const searchRes = await fetch(
          "https://ja.wikipedia.org/w/api.php?action=query&list=search&srsearch=" +
          encodeURIComponent(userMessage) +
          "&format=json&origin=*"
        );

        const searchData = await searchRes.json();
        const first = searchData?.query?.search?.[0];

        if (first) {
          const pageRes = await fetch(
            "https://ja.wikipedia.org/api/rest_v1/page/summary/" +
            encodeURIComponent(first.title)
          );

          if (pageRes.ok) {
            const pageData = await pageRes.json();
            infoText = pageData.extract || "";
          }
        }
      } catch (e) {}
    }

    const systemPrompt = `
あなたは自然な会話ができるAIです。

【ルール】
・普通の会話はそのまま返す（解説しない）
・挨拶には挨拶で返す
・情報があるときだけ参考にする
・セリフなど曖昧なものは無理に答えない

【参考情報】
${infoText}
`;

    const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": \`Bearer \${process.env.GROQ_API_KEY}\`,
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

    const data = await aiRes.json();

    return res.status(200).json({
      reply: data?.choices?.[0]?.message?.content || "分からない"
    });

  } catch (e) {
    return res.status(500).json({
      reply: "エラー：" + e.message
    });
  }
}
