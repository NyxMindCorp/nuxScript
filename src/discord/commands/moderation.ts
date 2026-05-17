import { SlashCommandBuilder, CommandInteraction, PermissionResolvable, GuildMember } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('moderation')
  .setDescription('Moderation toolkit for server management')
  .addSubcommand(subcommand =>
    subcommand
      .setName('warn')
      .setDescription('Warn a user')
      .addUserOption(option =>
        option
          .setName('user')
          .setDescription('The user to warn')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('reason')
          .setDescription('Reason for the warning')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('mute')
      .setDescription('Mute a user')
      .addUserOption(option =>
        option
          .setName('user')
          .setDescription('The user to mute')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('duration')
          .setDescription('Duration (e.g., 10m, 1h, 1d)')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('reason')
          .setDescription('Reason for the mute')
          .setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('kick')
      .setDescription('Kick a user')
      .addUserOption(option =>
        option
          .setName('user')
          .setDescription('The user to kick')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('reason')
          .setDescription('Reason for the kick')
          .setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('ban')
      .setDescription('Ban a user')
      .addUserOption(option =>
        option
          .setName('user')
          .setDescription('The user to ban')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('reason')
          .setDescription('Reason for the ban')
          .setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('softban')
      .setDescription('Softban a user (ban and unban to delete messages)')
      .addUserOption(option =>
        option
          .setName('user')
          .setDescription('The user to softban')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('reason')
          .setDescription('Reason for the softban')
          .setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('purge')
      .setDescription('Delete recent messages')
      .addIntegerOption(option =>
        option
          .setName('amount')
          .setDescription('Number of messages to delete (1-100)')
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(100)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('slowmode')
      .setDescription('Set slowmode for the channel')
      .addIntegerOption(option =>
        option
          .setName('seconds')
          .setDescription('Slowmode duration in seconds')
          .setRequired(true)
          .setMinValue(0)
          .setMaxValue(21600) // 6 hours max
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('lockdown')
      .setDescription('Lock down the channel (prevent everyone from sending messages)')
  );

export async function execute(interaction: CommandInteraction, context: any) {
  const { readData, writeData } = context;
  const subcommand = interaction.options.getSubcommand();

  // Check if user has permission to use moderation commands
  if (!interaction.memberPermissions?.has('ManageMessages') && 
      !interaction.memberPermissions?.has('KickMembers') && 
      !interaction.memberPermissions?.has('BanMembers') && 
      !interaction.memberPermissions?.has('ManageChannels')) {
    return interaction.reply({ 
      content: 'You do not have permission to use moderation commands.', 
      ephemeral: true 
    });
  }

  if (subcommand === 'warn') {
    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason', true);
    
    // Store warning in data
    const warnings = readData('./data/warnings.json', []);
    warnings.push({
      userId: user.id,
      moderatorId: interaction.user.id,
      reason,
      timestamp: Date.now()
    });
    writeData('./data/warnings.json', warnings);
    
    await interaction.reply({ 
      content: `User ${user.tag} has been warned.\nReason: ${reason}` 
    });
  } else if (subcommand === 'mute') {
    const user = interaction.options.getUser('user', true);
    const durationStr = interaction.options.getString('duration', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';
    
    // Parse duration
    const durationMs = parseDuration(durationStr);
    if (isNaN(durationMs)) {
      return interaction.reply({ 
        content: 'Invalid duration format. Use format like 10m, 1h, 1d.', 
        ephemeral: true 
      });
    }
    
    const member = interaction.guild?.members.cache.get(user.id);
    if (!member) {
      return interaction.reply({ 
        content: 'User not found in this server.', 
        ephemeral: true 
      });
    }
    
    // Timeout the user (Discord's timeout feature)
    await member.timeout(durationMs, reason);
    
    await interaction.reply({ 
      content: `User ${user.tag} has been muted for ${durationStr}.\nReason: ${reason}` 
    });
  } else if (subcommand === 'kick') {
    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';
    
    const member = interaction.guild?.members.cache.get(user.id);
    if (!member) {
      return interaction.reply({ 
        content: 'User not found in this server.', 
        ephemeral: true 
      });
    }
    
    await member.kick(reason);
    
    await interaction.reply({ 
      content: `User ${user.tag} has been kicked.\nReason: ${reason}` 
    });
  } else if (subcommand === 'ban') {
    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';
    
    await interaction.guild?.members.ban(user.id, { reason });
    
    await interaction.reply({ 
      content: `User ${user.tag} has been banned.\nReason: ${reason}` 
    });
  } else if (subcommand === 'softban') {
    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';
    
    const member = interaction.guild?.members.cache.get(user.id);
    if (!member) {
      return interaction.reply({ 
        content: 'User not found in this server.', 
        ephemeral: true 
      });
    }
    
    // Ban the user
    await member.ban({ reason: `${reason} (softban)` });
    // Immediately unban to delete messages
    await interaction.guild?.members.unban(user.id, 'Softban completed');
    
    await interaction.reply({ 
      content: `User ${user.tag} has been softbanned.\nReason: ${reason}` 
    });
  } else if (subcommand === 'purge') {
    const amount = interaction.options.getInteger('amount', true);
    
    if (amount < 1 || amount > 100) {
      return interaction.reply({ 
        content: 'Amount must be between 1 and 100.', 
        ephemeral: true 
      });
    }
    
    const messages = await interaction.channel.bulkDelete(amount, true);
    
    await interaction.reply({ 
      content: `Successfully deleted ${messages.size} messages.`, 
      ephemeral: true 
    });
  } else if (subcommand === 'slowmode') {
    const seconds = interaction.options.getInteger('seconds', true);
    
    await interaction.channel.setRateLimitPerUser(seconds);
    
    await interaction.reply({ 
      content: `Slowmode set to ${seconds} seconds.` 
    });
  } else if (subcommand === 'lockdown') {
    // Deny SEND_MESSAGES permission for @everyone
    const everyoneRole = interaction.guild?.roles.everyone;
    if (!everyoneRole) {
      return interaction.reply({ 
        content: 'Could not find @everyone role.', 
        ephemeral: true 
      });
    }
    
    await interaction.channel.permissionOverwrites.edit(everyoneRole, {
      SendMessages: false
    });
    
    await interaction.reply({ 
      content: 'Channel locked down. Only moderators/administrators can send messages.' 
    });
  }
}

// Helper function to parse duration strings like 10m, 1h, 1d
function parseDuration(str: string): number {
  const match = str.match(/^(\d+)([smhd])$/);
  if (!match) return NaN;
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return NaN;
  }
}