import { SlashCommandBuilder, CommandInteraction, PermissionResolvable, ChannelType, PermissionOverwrites } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('ticket')
  .setDescription('Manage support tickets')
  .addSubcommand(subcommand =>
    subcommand
      .setName('open')
      .setDescription('Open a new support ticket')
      .addStringOption(option =>
        option
          .setName('issue')
          .setDescription('Describe the issue you need help with')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('close')
      .setDescription('Close the current ticket')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('claim')
      .setDescription('Claim the current ticket')
  );

export async function execute(interaction: CommandInteraction, context: any) {
  const { tickets, readData, writeData } = context;
  const subcommand = interaction.options.getSubcommand();

  // Helper to generate ticket ID
  const generateId = () => `ticket_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

  if (subcommand === 'open') {
    const issue = interaction.options.getString('issue', true);
    
    // Check if user already has an open ticket
    const openTicket = tickets.find(t => 
      t.userId === interaction.user.id && 
      t.status === 'open'
    );
    
    if (openTicket) {
      return interaction.reply({ 
        content: 'You already have an open ticket. Please close it before opening a new one.', 
        ephemeral: true 
      });
    }

    const ticketId = generateId();
    const newTicket = {
      id: ticketId,
      userId: interaction.user.id,
      issue,
      status: 'open',
      createdAt: Date.now(),
      claimedBy: null,
      channelId: null
    };

    tickets.push(newTicket);
    await writeData('./data/tickets.json', tickets);

    // Create a private channel for the ticket
    const guild = interaction.guild;
    if (!guild) {
      return interaction.reply({ 
        content: 'This command can only be used in a server.', 
        ephemeral: true 
      });
    }

    // Find or create a category for tickets
    let ticketCategory = guild.channels.cache.find(
      c => c.type === ChannelType.GuildCategory && c.name === 'tickets'
    );

    if (!ticketCategory) {
      ticketCategory = await guild.channels.create({
        name: 'tickets',
        type: ChannelType.GuildCategory
      });
    }

    // Create the ticket channel
    const channel = await guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: ticketCategory.id,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
        },
        {
          id: interaction.client.user?.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
        }
      ]
    });

    // Update ticket with channel ID
    newTicket.channelId = channel.id;
    await writeData('./data/tickets.json', tickets);

    // Send welcome message in the ticket channel
    await channel.send({
      content: `<@${interaction.user.id}> Your ticket has been opened!\n\n**Issue:** ${issue}\n\nA moderator will be with you shortly. Use \`/ticket claim\` to claim this ticket or \`/ticket close\` to close it when resolved.`
    });

    await interaction.reply({ 
      content: `Your ticket has been opened! Please check <#${channel.id}> for your ticket channel.`, 
      ephemeral: true 
    });
  } else if (subcommand === 'close') {
    // Find the ticket for this channel
    const ticket = tickets.find(t => t.channelId === interaction.channelId && t.status === 'open');
    
    if (!ticket) {
      return interaction.reply({ 
        content: 'This is not an open ticket channel.', 
        ephemeral: true 
      });
    }

    // Check permissions: only the ticket opener, administrators, or moderators can close
    if (ticket.userId !== interaction.user.id && 
        !interaction.memberPermissions?.has('Administrator') && 
        !interaction.memberPermissions?.has('ManageMessages')) {
      return interaction.reply({ 
        content: 'You do not have permission to close this ticket.', 
        ephemeral: true 
      });
    }

    // Update ticket status
    ticket.status = 'closed';
    ticket.closedAt = Date.now();
    await writeData('./data/tickets.json', tickets);

    // Send closing message and delete channel after delay
    await interaction.reply({ 
      content: 'This ticket is being closed. The channel will be deleted in 5 seconds...' 
    });

    setTimeout(async () => {
      try {
        await interaction.channel.delete('Ticket closed');
      } catch (error) {
        console.error('Error deleting ticket channel:', error);
      }
    }, 5000);
  } else if (subcommand === 'claim') {
    // Find the ticket for this channel
    const ticket = tickets.find(t => t.channelId === interaction.channelId && t.status === 'open');
    
    if (!ticket) {
      return interaction.reply({ 
        content: 'This is not an open ticket channel.', 
        ephemeral: true 
      });
    }

    // Check permissions: only administrators or moderators can claim
    if (!interaction.memberPermissions?.has('Administrator') && 
        !interaction.memberPermissions?.has('ManageMessages')) {
      return interaction.reply({ 
        content: 'You do not have permission to claim tickets.', 
        ephemeral: true 
      });
    }

    // Check if ticket is already claimed
    if (ticket.claimedBy) {
      return interaction.reply({ 
        content: `This ticket has already been claimed by <@${ticket.claimedBy}>.`, 
        ephemeral: true 
      });
    }

    // Claim the ticket
    ticket.claimedBy = interaction.user.id;
    await writeData('./data/tickets.json', tickets);

    await interaction.reply({ 
      content: `You have claimed this ticket! <@${ticket.userId}>`, 
    });
  }
}