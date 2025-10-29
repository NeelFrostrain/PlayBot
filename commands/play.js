const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
} = require("@discordjs/voice");
const YtDlpManager = require("../utils/YtDlpManager");
const backgroundDownloader = require("../utils/BackgroundDownloader");
const fileCleanup = require("../utils/FileCleanup");
const fs = require("fs-extra");

const ytdlp = new YtDlpManager();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play music using yt-dlp (download and play)")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("Song name or YouTube URL")
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName("skip")
        .setDescription("Skip to this song immediately")
        .setRequired(false)
    ),

  async execute(interaction) {
    const query = interaction.options.getString("query");
    const skipToSong = interaction.options.getBoolean("skip") || false;
    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) {
      const embed = new EmbedBuilder()
        .setTitle("❌ Voice Channel Required")
        .setDescription("You need to be in a voice channel to play music!")
        .setColor("#ff0000");

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Check if yt-dlp is available
    const ytdlpAvailable = await ytdlp.checkYtDlp();
    if (!ytdlpAvailable) {
      const embed = new EmbedBuilder()
        .setTitle("❌ yt-dlp Not Found")
        .setDescription("yt-dlp is not installed or not available in PATH.")
        .setColor("#ff0000")
        .addFields(
          {
            name: "Windows",
            value:
              "Download from [GitHub Releases](https://github.com/yt-dlp/yt-dlp/releases)",
            inline: false,
          },
          {
            name: "Linux",
            value: "`sudo apt install yt-dlp` or `pip install yt-dlp`",
            inline: false,
          },
          { name: "macOS", value: "`brew install yt-dlp`", inline: false }
        )
        .setFooter({ text: "See YT-DLP-SETUP.md for detailed instructions" });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    await interaction.deferReply();

    try {
      let url = query;
      let videoInfo;

      // If not a URL, search for the song
      if (!query.includes("youtube.com") && !query.includes("youtu.be")) {
        const searchResults = await ytdlp.searchVideos(query, 1);
        if (!searchResults.length) {
          return interaction.editReply("No results found for your search!");
        }
        url = `https://www.youtube.com/watch?v=${searchResults[0].id}`;
        videoInfo = searchResults[0];
      } else {
        videoInfo = await ytdlp.getVideoInfo(url);
      }

      // Get or create queue for this guild
      let queue = interaction.client.queues.get(interaction.guildId);

      if (!queue) {
        const MusicQueue = require("../utils/MusicQueue");
        queue = new MusicQueue(interaction.guildId);
        queue.textChannel = interaction.channel;
        queue.voiceChannel = voiceChannel;
        interaction.client.queues.set(interaction.guildId, queue);
      }

      const song = {
        title: videoInfo.title,
        url: url,
        duration: videoInfo.duration || 0,
        thumbnail: videoInfo.thumbnail,
        requestedBy: interaction.user,
        addedAt: new Date(),
        uploader: videoInfo.uploader,
        id: videoInfo.id,
        filepath: null, // Will be set after download
      };

      // Add song to queue
      if (skipToSong && queue.songs.length > 0) {
        queue.songs.splice(1, 0, song);
      } else {
        queue.addSong(song);
      }

      // Setup connection if needed
      if (!queue.connection) {
        try {
          queue.connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: interaction.guildId,
            adapterCreator: interaction.guild.voiceAdapterCreator,
          });

          await entersState(
            queue.connection,
            VoiceConnectionStatus.Ready,
            30000
          );

          queue.player = createAudioPlayer();
          queue.connection.subscribe(queue.player);

          queue.player.on(AudioPlayerStatus.Idle, () => {
            handleSongEnd(queue, interaction.client);
          });

          queue.player.on("error", (error) => {
            console.error("Audio player error:", error);
            interaction
              .followUp({
                content: `Audio error: ${error.message}`,
                ephemeral: true,
              })
              .catch(console.error);
            handleSongEnd(queue, interaction.client);
          });
        } catch (connectionError) {
          console.error(
            "Failed to establish voice connection:",
            connectionError
          );
          return interaction.editReply("Failed to connect to voice channel!");
        }
      }

      // Start playing if not already playing
      if (!queue.playing) {
        await playNextSong(queue, interaction);
        queue.playing = true;
      } else {
        const position = skipToSong ? "next" : `#${queue.songs.length}`;
        const embed = new EmbedBuilder()
          .setAuthor({ 
            name: "✅ Added to Queue", 
            iconURL: 'https://cdn.discordapp.com/emojis/735119204181221386.png' 
          })
          .setTitle(song.title)
          .setDescription(`
            **📍 Position:** ${position}
            **🎤 Artist:** ${song.uploader || "Unknown"}
            **⏱️ Duration:** ${ytdlp.formatDuration(song.duration)}
            **👤 Requested by:** ${song.requestedBy}
          `)
          .setColor("#00D4FF")
          .setFooter({ 
            text: `Queue length: ${queue.songs.length} songs`,
            iconURL: song.requestedBy.displayAvatarURL({ size: 32 })
          })
          .setTimestamp();

        if (song.thumbnail) {
          embed.setThumbnail(song.thumbnail);
        }
        
        if (song.url) {
          embed.setURL(song.url);
        }

        // Create quick action buttons for queued song
        const queueActionRow = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('music_controls_panel')
              .setLabel('Control Panel')
              .setEmoji('🎛️')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId('music_queue')
              .setLabel('View Queue')
              .setEmoji('📋')
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setLabel('YouTube')
              .setEmoji('🎬')
              .setStyle(ButtonStyle.Link)
              .setURL(song.url || 'https://youtube.com')
          );

        // Start background downloading if not already active
        if (!backgroundDownloader.isDownloading(queue.guildId)) {
          backgroundDownloader.startDownloading(queue);
        }

        return interaction.editReply({ embeds: [embed], components: [queueActionRow] });
      }

      // Start background downloading for future songs
      if (
        queue.songs.length > 1 &&
        !backgroundDownloader.isDownloading(queue.guildId)
      ) {
        backgroundDownloader.startDownloading(queue);
      }
    } catch (error) {
      console.error("Play command error:", error);

      let errorTitle = "❌ Playback Error";
      let errorDescription = "An error occurred while trying to play the song!";

      if (error.message.includes("Video unavailable")) {
        errorTitle = "❌ Video Unavailable";
        errorDescription =
          "This video is unavailable, private, or has been deleted!";
      } else if (error.message.includes("age")) {
        errorTitle = "❌ Age Restricted";
        errorDescription =
          "This video is age-restricted and cannot be played by bots!";
      } else if (error.message.includes("copyright")) {
        errorTitle = "❌ Copyright Block";
        errorDescription =
          "This video is blocked due to copyright restrictions!";
      } else if (error.message.includes("Search failed")) {
        errorTitle = "❌ Search Failed";
        errorDescription = "Could not find any results for your search query!";
      }

      const errorEmbed = new EmbedBuilder()
        .setTitle(errorTitle)
        .setDescription(errorDescription)
        .setColor("#ff0000")
        .addFields(
          {
            name: "Query",
            value: query.length > 100 ? query.substring(0, 100) + "..." : query,
            inline: true,
          },
          {
            name: "Error Details",
            value:
              error.message.length > 500
                ? error.message.substring(0, 500) + "..."
                : error.message,
            inline: false,
          }
        )
        .setTimestamp();

      return interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};

async function playNextSong(queue, interaction = null) {
  if (queue.songs.length === 0) {
    queue.playing = false;
    return;
  }

  const song = queue.songs[0];
  console.log(`Playing with yt-dlp: ${song.title}`);

  try {
    let downloadResult;
    let progressMessage = null; // Declare at function scope

    // Check if song is already downloaded
    if (queue.isSongDownloaded(song)) {
      console.log(`Using pre-downloaded file: ${song.title}`);
      downloadResult = {
        filepath: song.filepath,
        cached: true,
      };

      // Show instant ready message
      if (interaction) {
        const instantEmbed = new EmbedBuilder()
          .setTitle("⚡ Instant Play Ready")
          .setDescription(`**${song.title}**`)
          .setColor("#00ff00")
          .addFields(
            { name: "Status", value: "💾 Pre-downloaded", inline: true },
            { name: "Ready", value: "Instantly!", inline: true }
          );

        try {
          progressMessage = await interaction.editReply({
            embeds: [instantEmbed],
          });
        } catch (error) {
          if (queue.textChannel) {
            queue.textChannel.send({ embeds: [instantEmbed] }).catch(() => {});
          }
        }
      }
    } else {
      // Download the audio file with progress tracking
      downloadResult = await ytdlp.downloadAudio(
        song.url,
        async (progress, videoInfo) => {
          const embed = ytdlp.createProgressEmbed(progress, videoInfo);

          // Only show progress in interaction if available, otherwise send to text channel
          if (interaction && !progressMessage) {
            try {
              progressMessage = await interaction.editReply({
                embeds: [embed],
              });
            } catch (error) {
              // If interaction fails, send to text channel
              if (queue.textChannel) {
                queue.textChannel
                  .send({ embeds: [embed] })
                  .then((msg) => {
                    setTimeout(() => msg.delete().catch(() => {}), 3000);
                  })
                  .catch(() => {});
              }
            }
          } else if (progressMessage) {
            await progressMessage.edit({ embeds: [embed] }).catch(() => {});
          } else if (queue.textChannel) {
            // Send progress to text channel if no interaction
            queue.textChannel
              .send({ embeds: [embed] })
              .then((msg) => {
                setTimeout(() => msg.delete().catch(() => {}), 3000);
              })
              .catch(() => {});
          }
        }
      );

      song.filepath = downloadResult.filepath;
    }

    // Check if file exists
    if (!(await fs.pathExists(downloadResult.filepath))) {
      throw new Error("Downloaded file not found");
    }

    // Create audio resource from downloaded file with volume control
    const resource = createAudioResource(downloadResult.filepath, {
      metadata: song,
      inlineVolume: true,
      inputType: "arbitrary",
    });

    // Set volume
    resource.volume?.setVolume(queue.volume);

    queue.player.play(resource);

    // Update message to show now playing
    const nowPlayingEmbed = new EmbedBuilder()
      .setAuthor({ 
        name: "🎵 Now Playing", 
        iconURL: 'https://cdn.discordapp.com/emojis/741605543046807626.gif' 
      })
      .setTitle(song.title)
      .setDescription(`
        🎵 ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬ 🎵
        
        **🎤 Artist:** ${song.uploader || "Unknown"}
        **⏱️ Duration:** ${ytdlp.formatDuration(song.duration)}
        **👤 Requested by:** ${song.requestedBy}
        **📥 Source:** ${downloadResult.cached ? "💾 Cached" : "📥 Downloaded"}
      `)
      .setColor("#1DB954")
      .setFooter({ 
        text: `Added to queue • Playing now`,
        iconURL: song.requestedBy.displayAvatarURL({ size: 32 })
      })
      .setTimestamp();

    if (song.thumbnail) {
      nowPlayingEmbed.setImage(song.thumbnail);
    }
    
    if (song.url) {
      nowPlayingEmbed.setURL(song.url);
    }

    // Create Music Control Panel button
    const controlPanelRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('music_controls_panel')
          .setLabel('Music Control Panel')
          .setEmoji('🎛️')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('music_pause')
          .setLabel('Pause')
          .setEmoji('⏸️')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('music_skip')
          .setLabel('Skip')
          .setEmoji('⏭️')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('music_queue')
          .setLabel('Queue')
          .setEmoji('📋')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setLabel('YouTube')
          .setEmoji('🎬')
          .setStyle(ButtonStyle.Link)
          .setURL(song.url || 'https://youtube.com')
      );

    // Send now playing message
    if (progressMessage) {
      await progressMessage.edit({ embeds: [nowPlayingEmbed], components: [controlPanelRow] }).catch(() => {});
    } else if (interaction) {
      try {
        await interaction.editReply({ embeds: [nowPlayingEmbed], components: [controlPanelRow] });
      } catch (error) {
        // If interaction fails, send to text channel
        if (queue.textChannel) {
          queue.textChannel
            .send({ embeds: [nowPlayingEmbed], components: [controlPanelRow] })
            .catch(console.error);
        }
      }
    } else if (queue.textChannel) {
      // Send to text channel if no interaction
      queue.textChannel
        .send({ embeds: [nowPlayingEmbed], components: [controlPanelRow] })
        .catch(console.error);
    }
  } catch (error) {
    console.error("Error playing song with yt-dlp:", error);

    const errorEmbed = new EmbedBuilder()
      .setTitle("❌ Playback Error")
      .setDescription(`Failed to play **${song.title}**`)
      .setColor("#ff0000")
      .addFields({
        name: "Error",
        value:
          error.message.length > 1000
            ? error.message.substring(0, 1000) + "..."
            : error.message,
        inline: false,
      });

    // Send error message
    if (interaction) {
      try {
        await interaction.editReply({ embeds: [errorEmbed] });
      } catch (interactionError) {
        if (queue.textChannel) {
          queue.textChannel.send({ embeds: [errorEmbed] }).catch(console.error);
        }
      }
    } else if (queue.textChannel) {
      queue.textChannel.send({ embeds: [errorEmbed] }).catch(console.error);
    }

    handleSongEnd(queue);
  }
}

async function handleSongEnd(queue, client) {
  const finishedSong = queue.songs[0];

  if (finishedSong) {
    queue.addToHistory(finishedSong);

    // Delete the audio file after playing (unless looping the same song)
    if (finishedSong.filepath && queue.loop !== "song") {
      fileCleanup.scheduleDelete(finishedSong.filepath);
    }
  }

  if (queue.loop === "song") {
    // Replay the same song (don't delete file)
    playNextSong(queue, null);
  } else if (queue.loop === "queue" && finishedSong) {
    // Move current song to end of queue
    queue.songs.shift();
    queue.songs.push(finishedSong);
    if (queue.songs.length > 0) {
      playNextSong(queue, null);
    } else {
      queue.playing = false;
      // Check 24/7 mode before disconnecting
      handle247Mode(queue, client);
    }
  } else {
    // Normal progression
    queue.songs.shift();
    if (queue.songs.length > 0) {
      playNextSong(queue, null);
    } else {
      queue.playing = false;
      // Check 24/7 mode before disconnecting
      handle247Mode(queue, client);
    }
  }
}

function handle247Mode(queue, client) {
  if (!client || !client.settings247) return;
  
  const guildSettings = client.settings247.get(queue.guildId);
  
  // If 24/7 mode is disabled or not set, disconnect after a delay
  if (!guildSettings || !guildSettings.enabled) {
    setTimeout(() => {
      if (queue && queue.connection && queue.songs.length === 0 && !queue.playing) {
        queue.connection.destroy();
        if (client.queues) {
          client.queues.delete(queue.guildId);
        }
      }
    }, 30000); // Wait 30 seconds before disconnecting
  }
  // If 24/7 mode is enabled, keep the connection alive
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}
