import client from "./client";
import { streamChatGPT, type Message as ChatMessage } from "./chatgpt/streamChatGPT";

import { Events, ChannelType, ClientUser, Message } from "discord.js";

let me: null | ClientUser  = null;

client.on(Events.ClientReady, (event) => {
  console.log(`Logged in as ${event.user.username}(${event.user.id})`);
  me = event.user;
});

const isMentioned = (message: Message) => {
  if (!me) return false;
  return message.mentions.has(me);
};

const removeMention = (message: Message) => {
  const content = message.content;
  if (!me) return content;
  return content.replace(`<@${me.id}>`, "").trim();
};

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (message.channel.type === ChannelType.PublicThread) {
    await message.channel.send("Hello from a thread!");
    return;
  }
  if (message.channel.type !== ChannelType.GuildText) return;
  if (!isMentioned(message)) return;
  const messageContent = removeMention(message);
  const threadChannel = await message.startThread({
    name: messageContent.slice(0, 100),
  });
  const ChatMessage: ChatMessage[] = [
    {
      role: "user",
      content: messageContent,
    }
  ];
  const stream = await streamChatGPT(ChatMessage);
  const reader = stream.getReader();
  let result = "";
  for (;;) {
    await threadChannel.sendTyping();
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    result += value;
  }
  await threadChannel.send(result);
});

client.login(process.env.DISCORD_BOT_TOKEN);
