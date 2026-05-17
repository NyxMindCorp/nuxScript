import { SlashCommandBuilder, CommandInteraction } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('8ball')
  .setDescription('Ask the magic 8 ball a question')
  .addSubcommand(subcommand =>
    subcommand
      .setName('ask')
      .setDescription('Ask the magic 8 ball a question')
      .addStringOption(option =>
        option
          .setName('question')
          .setDescription('Your yes/no question')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('add')
      .setDescription('Add a custom response to the 8 ball')
      .addStringOption(option =>
        option
          .setName('response')
          .setDescription('The custom response to add')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('list')
      .setDescription('List all current 8 ball responses')
  );

export async function execute(interaction: CommandInteraction, context: any) {
  const { eightballResponses, readData, writeData } = context;
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'ask') {
    const question = interaction.options.getString('question');
    if (!question) {
      return interaction.reply({ content: 'Please provide a question.', ephemeral: true });
    }

    const randomIndex = Math.floor(Math.random() * eightballResponses.length);
    const response = eightballResponses[randomIndex];

    await interaction.reply({ content: `🎱 ${response}` });
  } else if (subcommand === 'add') {
    const newResponse = interaction.options.getString('response');
    if (!newResponse) {
      return interaction.reply({ content: 'Please provide a response to add.', ephemeral: true });
    }

    // Check if response already exists
    if (eightballResponses.includes(newResponse)) {
      return interaction.reply({ content: 'That response already exists.', ephemeral: true });
    }

    eightballResponses.push(newResponse);
    writeData('./data/8ball.json', eightballResponses);

    await interaction.reply({ content: `Added response: "${newResponse}"\nTotal responses: ${eightballResponses.length}`, ephemeral: true });
  } else if (subcommand === 'list') {
    if (eightballResponses.length === 0) {
      return interaction.reply({ content: 'No responses configured.', ephemeral: true });
    }

    // Split into chunks if too long
    const chunkSize = 10;
    const chunks = [];
    for (let i = 0; i < eightballResponses.length; i += chunkSize) {
      chunks.push(eightballResponses.slice(i, i + chunkSize));
    }

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const content = chunk.map((resp, idx) => `${i * chunkSize + idx + 1}. ${resp}`).join('\n');
      if (i === 0) {
        await interaction.reply({ content: `**8 Ball Responses:**\n${content}` });
      } else {
        await interaction.followUp({ content: `**8 Ball Responses (continued):**\n${content}` });
      }
    }
  }
}