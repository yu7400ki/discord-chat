namespace NodeJS {
  interface ProcessEnv extends NodeJS.ProcessEnv {
    // Discord
    DISCORD_BOT_TOKEN: string;
    DISCORD_GUILD_ID: string;
    // API
    CHATGPT_API_KEY: string;
  }
}
