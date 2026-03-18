export default async function handler(req, res) {
  try {
    const { messages } = req.body;

    // ① 通常回答
    const response1 = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: messages
      })
    });

    const data1 = await response1.json();
    const answer = data1.choices?.[0]?.message?.content || "";

    // ② 自己チェック
    const response2 = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
            content: "以下の回答が事実として正しいか厳密にチェックし、間違っていれば『不正確』とだけ答えなさい。"
          },
          {
            role: "user",
            content: answer
          }
        ]
      })
    });

    const data2 = await response2.json();
    const check = data2.choices?.[0]?.message?.content || "";

    // ③ 判定
    if (check.includes("不正確")) {
      return res.status(200).json({
        reply: "その質問には正確に答えられません。情報に自信がありません。"
      });
    }

    return res.status(200).json({
      reply: answer
    });

  } catch (e) {
    return res.status(500).json({
      reply: "エラー：" + e.message
    });
  }
}
