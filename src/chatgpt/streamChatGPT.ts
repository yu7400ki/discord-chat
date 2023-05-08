export type Message = {
  role: "assistant" | "system" | "user";
  content: string;
};

const decoder = new TextDecoder();

const parser = (decoded: string): string => {
  let result = "";
  for (const line of decoded.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const trimmed = line.slice(5).trim();
    if (trimmed === "[DONE]") break;
    const parsed = JSON.parse(trimmed);
    const delta = parsed.choices[0].delta;
    if ("assistant" in delta) continue;
    if (!("content" in delta)) continue;
    result += delta.content;
  }
  return result
};

export const streamChatGPT = async (messages: Message[]) => {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.CHATGPT_API_KEY}`,
    },
    method: "POST",
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages,
      stream: true,
    }),
  });

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No reader");

  const stream = new ReadableStream<string>({
    async start(controller) {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const decoded = decoder.decode(value);
        const parsed = parser(decoded);
        controller.enqueue(parsed);
      }
      controller.close();
    },
  });

  return stream;
};
