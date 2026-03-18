export default async function handler(req, res) {
  const { messages } = req.body;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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

  const data = await response.json();

  res.status(200).json({
    reply: data.choices[0].message.content
  });
}
