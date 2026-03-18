const response = await fetch("/api/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ messages })
});

// 👇 まずテキストで受け取る
const text = await response.text();

console.log("サーバーの返り値:", text);

// 👇 JSON変換をtryで囲む
let data;
try {
  data = JSON.parse(text);
} catch (e) {
  console.error("JSON変換失敗", e);
  alert("サーバーエラー発生（HTMLが返ってきてる）");
  return;
}

addMessage(data.reply, "ai");
