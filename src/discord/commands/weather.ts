import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import axios from 'axios';

export const data = new SlashCommandBuilder()
  .setName('weather')
  .setDescription('Get current weather or forecast')
  .addStringOption(option =>
    option.setName('location')
      .setDescription('Location (e.g., city, ZIP code)')
      .setRequired(true)
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('forecast')
      .setDescription('Get weather forecast for multiple days')
      .addStringOption(option =>
        option.setName('location')
          .setDescription('Location (e.g., city, ZIP code)')
          .setRequired(true)
      )
      .addIntegerOption(option =>
        option.setName('days')
          .setDescription('Number of days for forecast (1-7)')
          .setMinValue(1)
          .setMaxValue(7)
          .setRequired(false)
      )
  );

export async function execute(interaction: CommandInteraction, context: any) {
  const { readData, writeData } = context;
  const subcommand = interaction.options.getSubcommand();
  
  // Helper function to fetch weather data from OpenWeatherMap API
  const fetchWeatherData = async (endpoint: string, params: Record<string, string | number>) => {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      throw new Error('OpenWeatherMap API key not configured');
    }
    
    const url = `https://api.openweathermap.org/data/2.5/${endpoint}`;
    const queryParams = new URLSearchParams({
      appid: apiKey,
      units: 'metric', // Use metric units, can be changed to imperial if needed
      ...params
    });
    
    const response = await axios.get(`${url}?${queryParams}`);
    return response.data;
  };
  
  if (subcommand === 'forecast') {
    const location = interaction.options.getString('location', true);
    const days = interaction.options.getInteger('days') ?? 1;
    
    try {
      // For forecast, we'll use the forecast endpoint
      const data = await fetchWeatherData('forecast', { q: location, cnt: days * 8 }); // 8 forecasts per day (3-hour intervals)
      
      // Process the forecast data to get daily summaries
      const dailyForecasts: any[] = [];
      const dailyMap: Record<string, any> = {};
      
      for (const item of data.list) {
        const date = new Date(item.dt * 1000).toISOString().split('T')[0];
        if (!dailyMap[date]) {
          dailyMap[date] = {
            date,
            temp: { min: item.main.temp, max: item.main.temp },
            description: item.weather[0].description,
            icon: item.weather[0].icon
          };
        } else {
          dailyMap[date].temp.min = Math.min(dailyMap[date].temp.min, item.main.temp);
          dailyMap[date].temp.max = Math.max(dailyMap[date].temp.max, item.main.temp);
          // Keep the first description/icon of the day for simplicity
        }
      }
      
      // Convert map to array and sort by date
      for (const date in dailyMap) {
        dailyForecasts.push(dailyMap[date]);
      }
      dailyForecasts.sort((a, b) => a.date.localeCompare(b.date));
      
      // Limit to requested days
      dailyForecasts.splice(days);
      
      // Build response message
      let response = `**Weather Forecast for ${location}** (next ${dailyForecasts.length} days):\n\n`;
      for (const forecast of dailyForecasts) {
        const date = new Date(forecast.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
        response += `**${date}**: ${forecast.description.charAt(0).toUpperCase() + forecast.description.slice(1)} ` +
          `(Min: ${Math.round(forecast.temp.min)}°C / Max: ${Math.round(forecast.temp.max)}°C)\n`;
      }
      
      await interaction.reply({ content: response });
    } catch (error) {
      console.error('Error fetching weather forecast:', error);
      if (axios.isAxiosError(error) && error.response) {
        await interaction.reply({ content: `Error: ${error.response.data.message || 'Unknown error'}`, ephemeral: true });
      } else {
        await interaction.reply({ content: 'Failed to fetch weather forecast. Please try again later.', ephemeral: true });
      }
    }
  } else {
    // Current weather (no subcommand)
    const location = interaction.options.getString('location', true);
    
    try {
      const data = await fetchWeatherData('weather', { q: location });
      
      const temp = Math.round(data.main.temp);
      const feelsLike = Math.round(data.main.feels_like);
      const humidity = data.main.humidity;
      const description = data.weather[0].description;
      const icon = data.weather[0].icon;
      const windSpeed = Math.round(data.wind.speed);
      
      const response = `**Current Weather for ${location}**\n` +
        `${description.charAt(0).toUpperCase() + description.slice(1)}\n` +
        `Temperature: ${temp}°C (Feels like: ${feelsLike}°C)\n` +
        `Humidity: ${humidity}%\n` +
        `Wind Speed: ${windSpeed} m/s\n` +
        `![Weather Icon](${`https://openweathermap.org/img/wn/${icon}@2x.png`})`;
      
      await interaction.reply({ content: response });
    } catch (error) {
      console.error('Error fetching current weather:', error);
      if (axios.isAxiosError(error) && error.response) {
        await interaction.reply({ content: `Error: ${error.response.data.message || 'Unknown error'}`, ephemeral: true });
      } else {
        await interaction.reply({ content: 'Failed to fetch current weather. Please try again later.', ephemeral: true });
      }
    }
  }
}