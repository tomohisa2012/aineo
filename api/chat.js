export default async function handler(req, res) {
  try {
    const { messages } = req.body;
    const userMessage = messages[messages.length - 1].content;

    let infoText = "";

    // 🔥 キャラっぽい質問判定
    const isCharacter =
      userMessage.includes("誰") ||
      userMessage.includes("キャラ") ||
      userMessage.includes("スタンド") ||
      userMessage.includes("能力");

    if (isCharacter) {
      // ピクシブ百科（簡易）
      try {
        const pixivRes = await fetch(
          "https://dic.pixiv.net/api/v1/search?word=" +
          encodeURIComponent(userMessage)
        );

        if (pixivRes.ok) {
          const pixivData = await pixivRes.json();
          infoText = JSON.stringify(pixivData).slice(0, 1000);
        }
      } catch (e) {
        console.log("pixiv error", e);
      }
    } else {
      // Wikipedia
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
        console.log("wiki error", e);
      }
    }

    const systemPrompt = `
以下の情報を参考に答えてください。
無い場合は無理に答えない。

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
