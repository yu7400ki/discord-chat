import {
  type Message as ChatMessage,
  streamChatGPT,
} from "./chatgpt/streamChatGPT";
import client from "./client";
import {
  AnyThreadChannel,
  ChannelType,
  ClientUser,
  Events,
  Message,
  TextChannel,
} from "discord.js";

let me: null | ClientUser = null;

client.on(Events.ClientReady, (event) => {
  console.log(`Logged in as ${event.user.username}(${event.user.id})`);
  me = event.user;
});

const isMentioned = (message: Message) => {
  if (!me) return false;
  return message.mentions.has(me);
};

const removeMention = (message: Message) => {
  if (!me) return message;
  const content = message.content;
  message.content = content.replace(`<@${me.id}>`, "").trim();
};

const replaceMention = (message: Message) => {
  message.mentions.users.forEach((user) => {
    message.content = message.content.replace(
      `<@${user.id}>`,
      `@${user.username}`,
    );
  });
}

const sendAnswer = async (
  channel: TextChannel | AnyThreadChannel,
  message: ChatMessage[],
) => {
  let lastSent = Date.now();
  let sentMessage: Message | null = null;
  let result = "";
  const stream = await streamChatGPT(message);
  const reader = stream.getReader();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    const now = Date.now();
    if (done) break;
    result += value;
    if (now - lastSent <= 1000) continue;
    if (sentMessage) {
      await sentMessage.edit(result);
    } else {
      sentMessage = await channel.send(result);
    }
    lastSent = now;
  }
  if (sentMessage) {
    await sentMessage.edit(result);
  } else {
    await channel.send(result);
  }
};

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (message.channel.isThread()) {
    await message.channel.send("Hello from a thread!");
    return;
  }
  if (message.channel.type !== ChannelType.GuildText) return;
  if (!isMentioned(message)) return;
  removeMention(message);
  replaceMention(message);
  const threadChannel = await message.startThread({
    name: message.content.slice(0, 100),
  });
  const chatMessage: ChatMessage[] = [
    {
      role: "user",
      content: message.content,
    },
  ];
  await sendAnswer(threadChannel, chatMessage);
});

client.login(process.env.DISCORD_BOT_TOKEN);
