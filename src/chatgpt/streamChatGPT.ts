export type Message = {
  role: "assistant" | "system" | "user";
  content: string;
};

type ParseResult = {
  content: string;
  isDone: boolean;
};

const decoder = new TextDecoder();

const parser = (decoded: string): null | ParseResult => {
  if (!decoded.startsWith("data:")) return null;
  const received = decoded.slice(5).trim();
  if (received === "[DONE]") return { content: "", isDone: true };
  const receivedJSON = JSON.parse(received);
  const delta = receivedJSON.choices[0].delta;
  if ("assistant" in delta) return null;
  if (!("content" in delta)) return null;
  const content = delta.content;
  return { content, isDone: false };
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
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        const decoded = decoder.decode(value);
        for (const line of decoded.split("\n")) {
          const parsed = parser(line);
          if (!parsed) continue;
          if (parsed.isDone) break;
          controller.enqueue(parsed.content);
        }
      }
      controller.close();
    },
  });

  return stream;
};
