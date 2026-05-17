import { SlashCommandBuilder, CommandInteraction, PermissionResolvable, MessageEmbed, MessageActionRow, MessageButton } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('poll')
  .setDescription('Create and manage polls')
  .addSubcommand(subcommand =>
    subcommand
      .setName('create')
      .setDescription('Create a new poll')
      .addStringOption(option =>
        option
          .setName('question')
          .setDescription('The poll question')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('option1')
          .setDescription('Option 1')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('option2')
          .setDescription('Option 2')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('option3')
          .setDescription('Option 3')
          .setRequired(false)
      )
      .addStringOption(option =>
        option
          .setName('option4')
          .setDescription('Option 4')
          .setRequired(false)
      )
      .addStringOption(option =>
        option
          .setName('option5')
          .setDescription('Option 5')
          .setRequired(false)
      )
      .addStringOption(option =>
        option
          .setName('option6')
          .setDescription('Option 6')
          .setRequired(false)
      )
      .addStringOption(option =>
        option
          .setName('option7')
          .setDescription('Option 7')
          .setRequired(false)
      )
      .addStringOption(option =>
        option
          .setName('option8')
          .setDescription('Option 8')
          .setRequired(false)
      )
      .addStringOption(option =>
        option
          .setName('option9')
          .setDescription('Option 9')
          .setRequired(false)
      )
      .addStringOption(option =>
        option
          .setName('option10')
          .setDescription('Option 10')
          .setRequired(false)
      )
      .addIntegerOption(option =>
        option
          .setName('duration')
          .setDuration('Duration in minutes (optional, max 60)')
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(60)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('end')
      .setDescription('End a poll early')
      .addStringOption(option =>
        option
          .setName('id')
          .setDescription('The poll ID to end')
          .setRequired(true)
      )
  );

export async function execute(interaction: CommandInteraction, context: any) {
  const { polls, readData, writeData } = context;
  const subcommand = interaction.options.getSubcommand();

  // Helper to generate poll ID
  const generateId = () => `poll_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

  if (subcommand === 'create') {
    const question = interaction.options.getString('question', true);
    const options = [];
    for (let i = 1; i <= 10; i++) {
      const opt = interaction.options.getString(`option${i}`);
      if (opt) {
        options.push(opt);
      } else {
        break;
      }
    }

    if (options.length < 2) {
      return interaction.reply({ 
        content: 'You must provide at least 2 options for the poll.', 
        ephemeral: true 
      });
    }

    if (options.length > 10) {
      return interaction.reply({ 
        content: 'You can provide a maximum of 10 options.', 
        ephemeral: true 
      });
    }

    const durationMinutes = interaction.options.getInteger('duration');
    const endTime = durationMinutes ? Date.now() + durationMinutes * 60 * 1000 : null;

    const pollId = generateId();
    const newPoll = {
      id: pollId,
      question,
      options,
      creator: {
        id: interaction.user.id,
        tag: interaction.user.tag
      },
      startTime: Date.now(),
      endTime: endTime,
      messageId: null, // Will be set after sending the message
      votes: {} // optionIndex => set of userIds
    };

    // Initialize votes for each option
    options.forEach((_, index) => {
      newPoll.votes[index] = new Set();
    });

    polls.push(newPoll);
    await writeData('./data/polls.json', polls);

    // Send the poll message
    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    const description = options.map((option, index) => 
      `${emojis[index]} ${option}`
    ).join('\n');

    const embed = new MessageEmbed()
      .setTitle('New Poll')
      .setDescription(`**${question}**\n\n${description}`)
      .setColor('#0099ff')
      .setTimestamp()
      .setFooter({ text: `Poll ID: ${pollId}` });

    if (endTime) {
      embed.addField('Ends at', `<t:${Math.floor(endTime / 1000)}:F>`, true);
    }

    const message = await interaction.reply({ 
      embeds: [embed],
      fetchReply: true
    });

    // Add reactions
    for (let i = 0; i < options.length; i++) {
      await message.react(emojis[i]);
    }

    // Update poll with message ID
    newPoll.messageId = message.id;
    await writeData('./data/polls.json', polls);

    // If duration is set, set a timer to end the poll
    if (durationMinutes) {
      setTimeout(async () => {
        // Find the poll again (in case it was updated)
        const pollIndex = polls.findIndex(p => p.id === pollId);
        if (pollIndex !== -1) {
          const poll = polls[pollIndex];
          if (poll.messageId) {
            try {
              const channel = interaction.channel;
              const msg = await channel.messages.fetch(poll.messageId);
              // React to collect votes
              const reactions = await msg.reactions.fetch();
              // Count votes
              const voteCounts = options.map((_, index) => {
                const emoji = emojis[index];
                const reaction = reactions.get(emoji);
                return reaction ? reaction.count - 1 : 0; // Subtract 1 for the bot's own reaction
              });
              // Find winning option(s)
              const maxVotes = Math.max(...voteCounts);
              const winners = voteCounts
                .map((count, index) => ({ index, count }))
                .filter(item => item.count === maxVotes)
                .map(item => item.index);

              let result = `**Poll Results**\n`;
              result += `Question: ${poll.question}\n\n`;
              options.forEach((option, index) => {
                result += `${emojis[index]} ${option}: ${voteCounts[index]} vote${voteCounts[index] !== 1 ? 's' : ''}\n`;
              });
              if (winners.length === 1) {
                result += `\n🏆 Winning option: ${options[winners[0]]}`;
              } else {
                result += `\n🏆 Tie between: ${winners.map(i => options[i]).join(', ')}`;
              }

              await channel.send({ content: result });
              // Remove the poll from active polls
              polls.splice(pollIndex, 1);
              await writeData('./data/polls.json', polls);
            } catch (error) {
              console.error('Error ending poll:', error);
            }
          }
        }
      }, durationMinutes * 60 * 1000);
    }
  } else if (subcommand === 'end') {
    // Check permissions: only administrators or moderators can end polls early
    if (!interaction.memberPermissions?.has('Administrator') && 
        !interaction.memberPermissions?.has('ManageMessages')) {
      return interaction.reply({ 
        content: 'You do not have permission to end polls.', 
        ephemeral: true 
      });
    }

    const pollId = interaction.options.getString('id', true);
    const pollIndex = polls.findIndex(p => p.id === pollId);
    if (pollIndex === -1) {
      return interaction.reply({ 
        content: `Poll with ID \`${pollId}\` not found.`, 
        ephemeral: true 
      });
    }

    const poll = polls[pollIndex];
    if (!poll.messageId) {
      return interaction.reply({ 
        content: `Poll \`${pollId}\` has no associated message.`, 
        ephemeral: true 
      });
    }

    try {
      const channel = interaction.channel;
      const msg = await channel.messages.fetch(poll.messageId);
      // React to collect votes
      const reactions = await msg.reactions.fetch();
      // Count votes
      const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
      const voteCounts = options.map((_, index) => {
        const emoji = emojis[index];
        const reaction = reactions.get(emoji);
        return reaction ? reaction.count - 1 : 0; // Subtract 1 for the bot's own reaction
      });
      // Find winning option(s)
      const maxVotes = Math.max(...voteCounts);
      const winners = voteCounts
        .map((count, index) => ({ index, count }))
        .filter(item => item.count === maxVotes)
        .map(item => item.index);

      let result = `**Poll Results**\n`;
      result += `Question: ${poll.question}\n\n`;
      poll.options.forEach((option, index) => {
        result += `${emojis[index]} ${option}: ${voteCounts[index]} vote${voteCounts[index] !== 1 ? 's' : ''}\n`;
      });
      if (winners.length === 1) {
        result += `\n🏆 Winning option: ${poll.options[winners[0]]}`;
      } else {
        result += `\n🏆 Tie between: ${winners.map(i => poll.options[i]).join(', ')}`;
      }

      await channel.send({ content: result });
      // Remove the poll from active polls
      polls.splice(pollIndex, 1);
      await writeData('./data/polls.json', polls);

      await interaction.reply({ 
        content: `Poll \`${pollId}\` has been ended and results posted.`, 
        ephemeral: true 
      });
    } catch (error) {
      console.error('Error ending poll:', error);
      await interaction.reply({ 
        content: 'Failed to end the poll. Please try again later.', 
        ephemeral: true 
      });
    }
  }
}