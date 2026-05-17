import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import axios from 'axios';

export const data = new SlashCommandBuilder()
  .setName('meme')
  .setDescription('Generate memes or list available templates')
  .addSubcommand(subcommand =>
    subcommand
      .setName('generate')
      .setDescription('Generate a meme with top and bottom text')
      .addStringOption(option =>
        option
          .setName('template')
          .setDescription('Meme template name')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('top')
          .setDescription('Top text')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('bottom')
          .setDescription('Bottom text')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('list')
      .setDescription('List available meme templates')
  );

export async function execute(interaction: CommandInteraction, context: any) {
  const { readData, writeData } = context;
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'generate') {
    const template = interaction.options.getString('template', true);
    const topText = interaction.options.getString('top', true);
    const bottomText = interaction.options.getString('bottom', true);

    await interaction.deferReply();

    try {
      // Using imgflip API for meme generation
      const username = process.env.IMGFLIP_USERNAME;
      const password = process.env.IMGFLIP_PASSWORD;

      if (!username || !password) {
        await interaction.editReply({ content: 'Meme generation is not configured. Please set IMGFLIP_USERNAME and IMGFLIP_PASSWORD environment variables.' });
        return;
      }

      // First, get available memes to find the template ID
      const memesResponse = await axios.get('https://api.imgflip.com/get_memes');
      const memesData = memesResponse.data;

      if (!memesData.success) {
        await interaction.editReply({ content: 'Failed to fetch meme templates. Please try again later.' });
        return;
      }

      // Find the template by name (case-insensitive)
      const templateObj = memesData.data.memes.find((m: any) => 
        m.name.toLowerCase() === template.toLowerCase()
      );

      if (!templateObj) {
        await interaction.editReply({ content: `Template "${template}" not found. Use /meme list to see available templates.` });
        return;
      }

      // Generate the meme
      const memeResponse = await axios.post('https://api.imgflip.com/caption_image', {
        template_id: templateObj.id,
        username: username,
        password: password,
        text0: topText,
        text1: bottomText
      });

      const memeData = memeResponse.data;

      if (!memeData.success) {
        await interaction.editReply({ content: 'Failed to generate meme. Please try again later.' });
        return;
      }

      await interaction.editReply({ content: memeData.data.url });
    } catch (error) {
      console.error('Error generating meme:', error);
      await interaction.editReply({ content: 'Failed to generate meme. Please try again later.' });
    }
  } else if (subcommand === 'list') {
    await interaction.deferReply();

    try {
      const response = await axios.get('https://api.imgflip.com/get_memes');
      const data = response.data;

      if (!data.success) {
        await interaction.editReply({ content: 'Failed to fetch meme templates. Please try again later.' });
        return;
      }

      // Get first 20 templates for the list
      const templates = data.data.memes.slice(0, 20);
      const templateList = templates.map((t: any, index: number) => 
        `${index + 1}. ${t.name}`
      ).join('\n');

      await interaction.editReply({ 
        content: `**Popular Meme Templates:** (showing first 20)\n${templateList}\n\nUse \`/meme generate <template> <top text> | <bottom text>\` to create a meme.`
      });
    } catch (error) {
      console.error('Error fetching meme templates:', error);
      await interaction.editReply({ content: 'Failed to fetch meme templates. Please try again later.' });
    }
  }
}