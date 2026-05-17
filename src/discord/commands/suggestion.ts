import { SlashCommandBuilder, CommandInteraction, PermissionResolvable } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('suggest')
  .setDescription('Submit or manage suggestions')
  .addSubcommand(subcommand =>
    subcommand
      .setName('submit')
      .setDescription('Submit a new suggestion')
      .addStringOption(option =>
        option
          .setName('idea')
          .setDescription('Your suggestion idea')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('list')
      .setDescription('List suggestions with optional status filter')
      .addStringOption(option =>
        option
          .setName('status')
          .setDescription('Filter by status (pending, accepted, rejected)')
          .addChoices(
            { name: 'Pending', value: 'pending' },
            { name: 'Accepted', value: 'accepted' },
            { name: 'Rejected', value: 'rejected' },
            { name: 'All', value: 'all' }
          )
          .setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('resolve')
      .setDescription('Resolve a suggestion (accept or reject)')
      .addStringOption(option =>
        option
          .setName('id')
          .setDescription('The suggestion ID to resolve')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('outcome')
          .setDescription('Whether to accept or reject the suggestion')
          .setRequired(true)
          .addChoices(
            { name: 'Accept', value: 'accept' },
            { name: 'Reject', value: 'reject' }
          )
      )
  );

export async function execute(interaction: CommandInteraction, context: any) {
  const { suggestions, readData, writeData } = context;
  const subcommand = interaction.options.getSubcommand();

  // Helper to suggest ID generation (simple timestamp-based)
  const generateId = () => `sug_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

  if (subcommand === 'submit') {
    const idea = interaction.options.getString('idea', true);
    const newSuggestion = {
      id: generateId(),
      idea,
      submitter: {
        id: interaction.user.id,
        tag: interaction.user.tag
      },
      status: 'pending',
      timestamp: Date.now()
    };

    suggestions.push(newSuggestion);
    await writeData('./data/suggestions.json', suggestions);

    await interaction.reply({ 
      content: `Thank you for your suggestion! It has been recorded with ID: \`${newSuggestion.id}\`.`,
      ephemeral: true 
    });
  } else if (subcommand === 'list') {
    const statusFilter = interaction.options.getString('status') || 'pending';
    let filtered = suggestions;
    if (statusFilter !== 'all') {
      filtered = suggestions.filter(s => s.status === statusFilter);
    }

    if (filtered.length === 0) {
      await interaction.reply({ 
        content: `No suggestions found with status: ${statusFilter}.`, 
        ephemeral: true 
      });
      return;
    }

    // Build response
    let response = `**Suggestions (${statusFilter}):**\n`;
    filtered.forEach((s, index) => {
      response += `${index + 1}. ID: \`${s.id}\`\n`;
      response += `   Idea: ${s.idea}\n`;
      response += `   Submitted by: ${s.submitter.tag} (<t:${Math.floor(s.timestamp / 1000)}:R>)\n`;
      response += `   Status: ${s.status}\n\n`;
    });

    // Split if too long
    if (response.length > 2000) {
      // Simple split by lines
      const lines = response.split('\n');
      let current = '';
      const chunks = [];
      lines.forEach(line => {
        if ((current + line + '\n').length > 2000) {
          chunks.push(current);
          current = line + '\n';
        } else {
          current += line + '\n';
        }
      });
      if (current) chunks.push(current);

      await interaction.reply({ content: chunks[0] });
      for (let i = 1; i < chunks.length; i++) {
        await interaction.followUp({ content: chunks[i] });
      }
    } else {
      await interaction.reply({ content: response });
    }
  } else if (subcommand === 'resolve') {
    // Check permissions: only administrators or moderators can resolve
    if (!interaction.memberPermissions?.has('Administrator') && 
        !interaction.memberPermissions?.has('ManageMessages')) {
      return interaction.reply({ 
        content: 'You do not have permission to resolve suggestions.', 
        ephemeral: true 
      });
    }

    const id = interaction.options.getString('id', true);
    const outcome = interaction.options.getString('outcome', true); // 'accept' or 'reject'

    const suggestionIndex = suggestions.findIndex(s => s.id === id);
    if (suggestionIndex === -1) {
      return interaction.reply({ 
        content: `Suggestion with ID \`${id}\` not found.`, 
        ephemeral: true 
      });
    }

    const suggestion = suggestions[suggestionIndex];
    suggestion.status = outcome === 'accept' ? 'accepted' : 'rejected';

    await writeData('./data/suggestions.json', suggestions);

    await interaction.reply({ 
      content: `Suggestion \`${id}\` has been ${outcome}ed.`, 
      ephemeral: true 
    });
  }
}