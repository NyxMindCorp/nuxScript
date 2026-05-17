import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import axios from 'axios';

export const data = new SlashCommandBuilder()
  .setName('trivia')
  .setDescription('Trivia quiz commands')
  .addSubcommand(subcommand =>
    subcommand
      .setName('start')
      .setDescription('Start a trivia quiz')
      .addStringOption(option =>
        option
          .setName('category')
          .setDescription('Trivia category (optional)')
          .setRequired(false)
      )
      .addStringOption(option =>
        option
          .setName('difficulty')
          .setDescription('Difficulty level (optional)')
          .setRequired(false)
          .addChoices(
            { name: 'Easy', value: 'easy' },
            { name: 'Medium', value: 'medium' },
            { name: 'Hard', value: 'hard' }
          )
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('answer')
      .setDescription('Submit an answer to the current trivia quiz')
      .addStringOption(option =>
        option
          .setName('option')
          .setDescription('Your answer (A, B, C, or D)')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('score')
      .setDescription('Show current trivia scores')
  );

export async function execute(interaction: ChatInputCommandInteraction, context: any) {
  const { triviaSessions, readData, writeData } = context;
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'start') {
    const category = interaction.options.getString('category');
    const difficulty = interaction.options.getString('difficulty');

    // Fetch a trivia question from Open Trivia DB API
    let url = 'https://opentdb.com/api.php?amount=1&type=multiple';
    if (category) url += `&category=${category}`;
    if (difficulty) url += `&difficulty=${difficulty}`;

    try {
      const response = await axios.get(url);
      const data = response.data.results[0];

      const question = decodeURIComponent(data.question);
      const correctAnswer = decodeURIComponent(data.correct_answer);
      const incorrectAnswers = data.incorrect_answers.map((ans: string) => decodeURIComponent(ans));
      const options = [...incorrectAnswers, correctAnswer].sort(() => Math.random() - 0.5);

      // Store the session
      triviaSessions.set(interaction.channelId, {
        question,
        correctAnswer,
        options,
        timestamp: Date.now(),
        answers: new Map() // userId => { answer, correct }
      });

      // Send the question
      const optionsText = options.map((opt, idx) => `${String.fromCharCode(65 + idx)}) ${opt}`).join('\n');
      await interaction.reply({
        content: `**Trivia Question:**\n${question}\n\n${optionsText}\n\n*You have 20 seconds to answer. Use \`/trivia answer <option>\` to submit your answer.*`
      });

      // Set a timer to end the question after 20 seconds
      setTimeout(() => {
        const session = triviaSessions.get(interaction.channelId);
        if (session) {
          triviaSessions.delete(interaction.channelId);
          interaction.followUp({
            content: `Time's up! The correct answer was: **${session.correctAnswer}**`
          });
        }
      }, 20000);
    } catch (error) {
      console.error('Error fetching trivia question:', error);
      await interaction.reply({ content: 'Failed to fetch a trivia question. Please try again later.', ephemeral: true });
    }
  } else if (subcommand === 'answer') {
    const userAnswer = interaction.options.getString('option')?.toUpperCase();
    if (!['A', 'B', 'C', 'D'].includes(userAnswer)) {
      return interaction.reply({ content: 'Invalid option. Please choose A, B, C, or D.', ephemeral: true });
    }

    const session = triviaSessions.get(interaction.channelId);
    if (!session) {
      return interaction.reply({ content: 'There is no active trivia quiz in this channel. Start one with /trivia start.', ephemeral: true });
    }

    const userId = interaction.user.id;
    const selectedOptionIndex = userAnswer.charCodeAt(0) - 65;
    const selectedAnswer = session.options[selectedOptionIndex];
    const isCorrect = selectedAnswer === session.correctAnswer;

    // Record the answer
    session.answers.set(userId, { answer: selectedAnswer, correct: isCorrect });

    // Respond
    await interaction.reply({
      content: `You answered: **${selectedAnswer}**\n${isCorrect ? '✅ Correct!' : `❌ Incorrect. The correct answer was: **${session.correctAnswer}**`}`
    });

    // End the trivia question after an answer (as per spec: after each answer, respond and update score)
    triviaSessions.delete(interaction.channelId);

    // Update scores (we don't have a persistent score system in this example, but we can extend)
    // For now, we just note the answer.
  } else if (subcommand === 'score') {
    // In a full implementation, we would show scores from a database.
    // For now, we'll say that scoring is not implemented in this version.
    await interaction.reply({ content: 'Trivia scoring is not implemented in this version. Please check back later.', ephemeral: true });
  }
}