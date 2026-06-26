import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { readdirSync, statSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { join, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const commandsPath = join(__dirname, 'src', 'commands');
const commands = [];

const categories = readdirSync(commandsPath).filter(f => statSync(join(commandsPath, f)).isDirectory());

for (const category of categories) {
  const files = readdirSync(join(commandsPath, category)).filter(f => f.endsWith('.js'));
  for (const file of files) {
    const { default: cmd } = await import(pathToFileURL(join(commandsPath, category, file)).href);
    if (cmd?.data) {
      commands.push(cmd.data.toJSON());
      console.log(`  ✅ ${cmd.data.name}`);
    }
  }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);
const global = process.argv.includes('--global');
const route  = global
  ? Routes.applicationCommands(process.env.CLIENT_ID)
  : Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID);

console.log(`\n📤 Registrando ${commands.length} comandos ${global ? 'globalmente' : 'en el servidor de pruebas'}...`);
const data = await rest.put(route, { body: commands });
console.log(`✅ ${data.length} comandos registrados correctamente.`);
