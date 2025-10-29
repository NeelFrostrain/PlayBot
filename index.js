require("dotenv").config();
const { Client, GatewayIntentBits, Collection } = require("discord.js");
// Voice imports are handled in individual command files
const fs = require("fs");
const path = require("path");
const config = require("./config");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
});

// Collections for commands and music queues
client.commands = new Collection();
client.queues = new Collection();
client.settings247 = new Collection();

// MusicQueue class is imported in individual command files as needed

// Load commands
const commandsPath = path.join(__dirname, "commands");
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
    } else {
      console.log(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }
}

client.once("clientReady", () => {
  console.log(`Ready! Logged in as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      console.error(
        `No command matching ${interaction.commandName} was found.`
      );
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "There was an error while executing this command!",
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "There was an error while executing this command!",
          ephemeral: true,
        });
      }
    }
  } else if (interaction.isButton()) {
    const queue = interaction.client.queues.get(interaction.guildId);

    // Handle button interactions for queue navigation
    if (interaction.customId.startsWith("queue_")) {
      if (!queue) {
        return interaction.reply({
          content: "No active music session!",
          ephemeral: true,
        });
      }

      if (interaction.customId.startsWith("queue_prev_")) {
        const currentPage = parseInt(interaction.customId.split("_")[2]);
        const newPage = Math.max(1, currentPage - 1);

        // Re-run queue command with new page
        const queueCommand = interaction.client.commands.get("queue");
        interaction.options = {
          getInteger: (optionName) => (optionName === "page" ? newPage : null),
        };
        await queueCommand.execute(interaction);
      } else if (interaction.customId.startsWith("queue_next_")) {
        const currentPage = parseInt(interaction.customId.split("_")[2]);
        const newPage = currentPage + 1;

        // Re-run queue command with new page
        const queueCommand = interaction.client.commands.get("queue");
        interaction.options = {
          getInteger: (optionName) => (optionName === "page" ? newPage : null),
        };
        await queueCommand.execute(interaction);
      } else if (interaction.customId === "queue_refresh") {
        // Re-run queue command with current page
        const queueCommand = interaction.client.commands.get("queue");
        interaction.options = {
          getInteger: () => null,
        };
        await queueCommand.execute(interaction);
      }
    }

    // Handle music control buttons
    else if (interaction.customId.startsWith("music_")) {
      if (!queue) {
        return interaction.reply({
          content: "No active music session!",
          ephemeral: true,
        });
      }

      const voiceChannel = interaction.member.voice.channel;
      if (!voiceChannel || voiceChannel.id !== queue.voiceChannel?.id) {
        return interaction.reply({
          content: "You need to be in the same voice channel as the bot!",
          ephemeral: true,
        });
      }

      switch (interaction.customId) {
        case "music_pause":
          const pauseCommand = interaction.client.commands.get("pause");
          await pauseCommand.execute(interaction);
          break;

        case "music_skip":
          const skipCommand = interaction.client.commands.get("skip");
          await skipCommand.execute(interaction);
          break;

        case "music_stop":
          const stopCommand = interaction.client.commands.get("stop");
          await stopCommand.execute(interaction);
          break;

        case "music_shuffle":
          const shuffleCommand = interaction.client.commands.get("shuffle");
          await shuffleCommand.execute(interaction);
          break;

        case "music_loop":
          // Cycle through loop modes
          const currentLoop = queue.loop;
          const nextLoop =
            currentLoop === "off"
              ? "song"
              : currentLoop === "song"
              ? "queue"
              : "off";
          queue.setLoop(nextLoop);

          const loopEmojis = { off: "➡️", song: "🔂", queue: "🔁" };
          const loopNames = { off: "Off", song: "Song", queue: "Queue" };

          await interaction.reply({
            content: `${loopEmojis[nextLoop]} Loop mode: **${loopNames[nextLoop]}**`,
            ephemeral: true,
          });
          break;

        case "music_queue":
          const queueCommand = interaction.client.commands.get("queue");
          interaction.options = {
            getInteger: () => null,
          };
          await queueCommand.execute(interaction);
          break;
          
        case "music_volume_up":
          const currentVolumeUp = queue.getVolumePercent();
          const newVolumeUp = Math.min(100, currentVolumeUp + 10);
          queue.setVolume(newVolumeUp);
          
          if (queue.player && queue.player.state.resource) {
            queue.player.state.resource.volume?.setVolume(queue.volume);
          }
          
          await interaction.reply({ 
            content: `🔊 Volume increased to **${newVolumeUp}%**`,
            ephemeral: true 
          });
          break;
          
        case "music_volume_down":
          const currentVolumeDown = queue.getVolumePercent();
          const newVolumeDown = Math.max(0, currentVolumeDown - 10);
          queue.setVolume(newVolumeDown);
          
          if (queue.player && queue.player.state.resource) {
            queue.player.state.resource.volume?.setVolume(queue.volume);
          }
          
          await interaction.reply({ 
            content: `🔉 Volume decreased to **${newVolumeDown}%**`,
            ephemeral: true 
          });
          break;
          
        case "music_refresh":
          const controlsCommand = interaction.client.commands.get("controls");
          await controlsCommand.execute(interaction);
          break;
          
        case "music_controls_panel":
          const controlsPanelCommand = interaction.client.commands.get("controls");
          await controlsPanelCommand.execute(interaction);
          break;
      }
    }
  }
});

// Voice state update handler for cleanup
client.on("voiceStateUpdate", (oldState) => {
  const queue = client.queues.get(oldState.guild.id);
  const guildSettings = client.settings247.get(oldState.guild.id);

  if (queue && oldState.channelId === queue.voiceChannel?.id) {
    const members = oldState.channel?.members.filter(
      (member) => !member.user.bot
    );

    if (members?.size === 0) {
      // Check if 24/7 mode is enabled
      if (guildSettings && guildSettings.enabled) {
        console.log(`24/7 mode active in ${oldState.guild.name}, staying connected`);
        return; // Don't disconnect in 24/7 mode
      }

      // No users left in voice channel, cleanup after 5 minutes
      setTimeout(() => {
        const currentQueue = client.queues.get(oldState.guild.id);
        const currentSettings = client.settings247.get(oldState.guild.id);
        
        if (
          currentQueue &&
          currentQueue.voiceChannel?.id === oldState.channelId &&
          (!currentSettings || !currentSettings.enabled)
        ) {
          const stillEmpty =
            oldState.channel?.members.filter((member) => !member.user.bot)
              .size === 0;
          if (stillEmpty) {
            // Stop background downloading
            const backgroundDownloader = require('./utils/BackgroundDownloader');
            backgroundDownloader.stopDownloading(oldState.guild.id);
            
            currentQueue.connection?.destroy();
            client.queues.delete(oldState.guild.id);
            console.log(
              `Left voice channel in ${oldState.guild.name} due to inactivity`
            );
          }
        }
      }, 300000); // 5 minutes
    }
  }
});

client.login(config.token);
