export default async function handler(req, res) {
  try {
    const { messages } = req.body || {};

    if (!messages) {
      return res.status(400).json({ reply: "messagesがない" });
    }

    const userMessage = messages[messages.length - 1]?.content || "";

    // 🔥 軽い会話判定
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
      } catch (e) {
        console.log("wiki error:", e);
      }
    }

    const systemPrompt = `
あなたは自然に会話できるAIです。

・挨拶には挨拶で返す
・無理に解説しない
・分からないことは答えない

【参考情報】
${infoText}
`;

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
      console.error("JSON parse error:", text);
      return res.status(500).json({
        reply: "AIの返答が壊れてる"
      });
    }

    return res.status(200).json({
      reply: data?.choices?.[0]?.message?.content || "分からない"
    });

  } catch (e) {
    console.error("server error:", e);
    return res.status(500).json({
      reply: "サーバーエラー：" + e.message
    });
  }
}
