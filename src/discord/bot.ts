import { Client, GatewayIntentBits, Collection, Interaction } from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

// Load environment variables
config();

// Data storage paths
const DATA_DIR = join(process.cwd(), 'data');
const TRIVIA_DATA = join(DATA_DIR, 'trivia.json');
const EIGHTBALL_DATA = join(DATA_DIR, '8ball.json');
const SUGGESTIONS_DATA = join(DATA_DIR, 'suggestions.json');
const POLLS_DATA = join(DATA_DIR, 'polls.json');
const TICKETS_DATA = join(DATA_DIR, 'tickets.json');
const WELCOME_DATA = join(DATA_DIR, 'welcome.json');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR);
}

// Helper functions for data storage
function readData<T>(filePath: string, defaultValue: T): T {
  if (!existsSync(filePath)) {
    writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
    return defaultValue;
  }
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return defaultValue;
  }
}

function writeData<T>(filePath: string, data: T): void {
  writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Initialize data stores
let triviaSessions: Map<string, any> = new Map(); // In-memory for active trivia sessions
let eightballResponses: string[] = readData(EIGHTBALL_DATA, [
  "It is certain",
  "It is decidedly so",
  "Without a doubt",
  "Yes definitely",
  "You may rely on it",
  "As I see it, yes",
  "Most likely",
  "Outlook good",
  "Yes",
  "Signs point to yes",
  "Reply hazy try again",
  "Ask again later",
  "Better not tell you now",
  "Cannot predict now",
  "Concentrate and ask again",
  "Don't count on it",
  "My reply is no",
  "My sources say no",
  "Outlook not so good",
  "Very doubtful"
]);
let suggestions: any[] = readData(SUGGESTIONS_DATA, []);
let polls: any[] = readData(POLLS_DATA, []);
let tickets: any[] = readData(TICKETS_DATA, []);
let welcomeMessages: { welcome: string; leave: string } = readData(WELCOME_DATA, { welcome: '', leave: '' });

// Extend Client type to include commands
declare module 'discord.js' {
  interface Client {
    commands: Collection<string, any>;
  }
}

const client = new Client({ intents: [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildMessageReactions
] }) as Client & { commands: Collection<string, any> };

client.commands = new Collection();

async function registerCommands() {
  const commandFiles = readdirSync(join(__dirname, 'commands')).filter(file => file.endsWith('.ts'));
  
  const commands = [];
  
  for (const file of commandFiles) {
    const command = await import(join(__dirname, 'commands', file));
    if (command.data) {
      commands.push(command.data.toJSON());
      client.commands.set(command.data.name, command);
    }
  }
  
  // Register commands globally
  const { REST } = require('@discordjs/rest');
  const { Routes } = require('discord-api-types/v10');
  
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    console.error('DISCORD_TOKEN not found in environment variables');
    process.exit(1);
  }
  
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);
    
    const data = await new REST({ version: '10' }).setToken(token).put(
      Routes.applicationCommands(client.user?.id ?? ''),
      { body: commands }
    );
    
    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    console.error(error);
  }
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user?.tag}!`);
  await registerCommands();
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  
  try {
    await command.execute(interaction, {
      triviaSessions,
      eightballResponses,
      suggestions,
      polls,
      tickets,
      welcomeMessages,
      readData,
      writeData
    });
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
    } else {
      await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
  }
});

client.login(process.env.DISCORD_TOKEN).catch(console.error);

export default client;