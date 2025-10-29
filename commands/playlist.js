const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const YtDlpManager = require('../utils/YtDlpManager');
const backgroundDownloader = require('../utils/BackgroundDownloader');
const fileCleanup = require('../utils/FileCleanup');
const fs = require('fs-extra');

const ytdlp = new YtDlpManager();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playlist')
        .setDescription('Play a YouTube playlist using yt-dlp')
        .addStringOption(option =>
            option.setName('url')
                .setDescription('YouTube playlist URL')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('limit')
                .setDescription('Maximum number of songs to add (default: 25)')
                .setMinValue(1)
                .setMaxValue(50)
                .setRequired(false)),
    
    async execute(interaction) {
        const playlistUrl = interaction.options.getString('url');
        const limit = interaction.options.getInteger('limit') || 25;
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            return interaction.reply('You need to be in a voice channel to play music!');
        }

        // Check if yt-dlp is available
        const ytdlpAvailable = await ytdlp.checkYtDlp();
        if (!ytdlpAvailable) {
            return interaction.reply({
                content: '❌ yt-dlp is not installed or not available in PATH.\n\n**Installation:**\n- Windows: Download from https://github.com/yt-dlp/yt-dlp/releases\n- Linux: `sudo apt install yt-dlp` or `pip install yt-dlp`',
                ephemeral: true
            });
        }

        await interaction.deferReply();

        try {
            // Get playlist info
            const loadingEmbed = new EmbedBuilder()
                .setTitle('📋 Loading Playlist')
                .setDescription('Fetching playlist information...')
                .setColor('#ff9900');
            
            await interaction.editReply({ embeds: [loadingEmbed] });

            const playlistVideos = await ytdlp.getPlaylistInfo(playlistUrl);
            
            if (!playlistVideos.length) {
                return interaction.editReply('No videos found in this playlist!');
            }

            // Limit the number of videos
            const videosToAdd = playlistVideos.slice(0, limit);

            // Get or create queue for this guild
            let queue = interaction.client.queues.get(interaction.guildId);
            
            if (!queue) {
                const MusicQueue = require('../utils/MusicQueue');
                queue = new MusicQueue(interaction.guildId);
                queue.textChannel = interaction.channel;
                queue.voiceChannel = voiceChannel;
                interaction.client.queues.set(interaction.guildId, queue);
            }

            // Add all videos to queue
            const addedSongs = [];
            for (const video of videosToAdd) {
                const song = {
                    title: video.title,
                    url: `https://www.youtube.com/watch?v=${video.id}`,
                    duration: video.duration || 0,
                    thumbnail: null, // Will be fetched when playing
                    requestedBy: interaction.user,
                    addedAt: new Date(),
                    id: video.id,
                    filepath: null
                };
                queue.addSong(song);
                addedSongs.push(song);
            }

            // Setup connection if needed
            if (!queue.connection) {
                try {
                    queue.connection = joinVoiceChannel({
                        channelId: voiceChannel.id,
                        guildId: interaction.guildId,
                        adapterCreator: interaction.guild.voiceAdapterCreator,
                    });

                    await entersState(queue.connection, VoiceConnectionStatus.Ready, 30000);

                    queue.player = createAudioPlayer();
                    queue.connection.subscribe(queue.player);
                    
                    queue.player.on(AudioPlayerStatus.Idle, () => {
                        handlePlaylistSongEnd(queue, interaction.client);
                    });

                    queue.player.on('error', error => {
                        console.error('Audio player error:', error);
                        handlePlaylistSongEnd(queue, interaction.client);
                    });

                } catch (connectionError) {
                    console.error('Failed to establish voice connection:', connectionError);
                    return interaction.editReply('Failed to connect to voice channel!');
                }
            }

            // Create playlist embed
            const playlistEmbed = new EmbedBuilder()
                .setTitle('📋 Playlist Added')
                .setDescription(`Added **${addedSongs.length}** songs to the queue`)
                .setColor('#00ff00')
                .addFields(
                    { name: 'Total Songs', value: addedSongs.length.toString(), inline: true },
                    { name: 'Requested by', value: interaction.user.toString(), inline: true },
                    { name: 'Queue Position', value: `${queue.songs.length - addedSongs.length + 1}-${queue.songs.length}`, inline: true }
                );

            // Show first few songs
            const songList = addedSongs.slice(0, 5).map((song, index) => 
                `${index + 1}. **${song.title}** (${ytdlp.formatDuration(song.duration)})`
            ).join('\n');

            if (songList) {
                playlistEmbed.addFields({
                    name: 'First Songs',
                    value: songList + (addedSongs.length > 5 ? `\n... and ${addedSongs.length - 5} more` : ''),
                    inline: false
                });
            }

            // Start playing if not already playing
            if (!queue.playing) {
                await playNextPlaylistSong(queue, interaction);
                queue.playing = true;
            }

            // Start background downloading for playlist songs
            if (queue.songs.length > 1 && !backgroundDownloader.isDownloading(queue.guildId)) {
                backgroundDownloader.startDownloading(queue);
            }

            return interaction.editReply({ embeds: [playlistEmbed] });

        } catch (error) {
            console.error('Playlist command error:', error);
            return interaction.editReply(`An error occurred while loading the playlist: ${error.message}`);
        }
    },
};

async function playNextPlaylistSong(queue, interaction = null) {
    if (queue.songs.length === 0) {
        queue.playing = false;
        return;
    }
    
    const song = queue.songs[0];
    console.log(`Playing playlist song with yt-dlp: ${song.title}`);
    
    try {
        // Get detailed video info if not already available
        if (!song.thumbnail) {
            const videoInfo = await ytdlp.getVideoInfo(song.url);
            song.thumbnail = videoInfo.thumbnail;
            song.uploader = videoInfo.uploader;
        }

        // Download the audio file
        const downloadResult = await ytdlp.downloadAudio(song.url, async (progress, videoInfo) => {
            // Only show progress for first song or every 25% for others
            if (queue.songs.indexOf(song) === 0 || progress % 25 === 0) {
                const embed = ytdlp.createProgressEmbed(progress, videoInfo);
                embed.setTitle('📋 Downloading Playlist Song');
                
                if (queue.textChannel) {
                    queue.textChannel.send({ embeds: [embed] }).then(msg => {
                        setTimeout(() => msg.delete().catch(() => {}), 5000);
                    }).catch(() => {});
                }
            }
        });

        song.filepath = downloadResult.filepath;

        // Create audio resource from downloaded file with volume control
        const resource = createAudioResource(downloadResult.filepath, {
            metadata: song,
            inlineVolume: true,
            inputType: 'arbitrary'
        });
        
        // Set volume
        resource.volume?.setVolume(queue.volume);
        
        queue.player.play(resource);

        // Send now playing message
        const nowPlayingEmbed = new EmbedBuilder()
            .setTitle('🎵 Now Playing (Playlist)')
            .setDescription(`**${song.title}**`)
            .setColor('#00ff00')
            .addFields(
                { name: 'Duration', value: ytdlp.formatDuration(song.duration), inline: true },
                { name: 'Requested by', value: song.requestedBy.username, inline: true },
                { name: 'Queue Position', value: `1 of ${queue.songs.length}`, inline: true },
                { name: 'Source', value: downloadResult.cached ? '💾 Cached' : '📥 Downloaded', inline: true }
            );

        if (song.thumbnail) nowPlayingEmbed.setThumbnail(song.thumbnail);

        if (queue.textChannel) {
            queue.textChannel.send({ embeds: [nowPlayingEmbed] }).catch(console.error);
        }
        
    } catch (error) {
        console.error('Error playing playlist song with yt-dlp:', error);
        
        if (queue.textChannel) {
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Playbook Error')
                .setDescription(`Failed to play **${song.title}**\nSkipping to next song...`)
                .setColor('#ff0000');
            
            queue.textChannel.send({ embeds: [errorEmbed] }).catch(console.error);
        }
        
        handlePlaylistSongEnd(queue);
    }
}

async function handlePlaylistSongEnd(queue, client) {
    const finishedSong = queue.songs[0];
    
    if (finishedSong) {
        queue.addToHistory(finishedSong);
        
        // Delete the audio file after playing (unless looping the same song)
        if (finishedSong.filepath && queue.loop !== 'song') {
            fileCleanup.scheduleDelete(finishedSong.filepath);
        }
    }
    
    if (queue.loop === 'song') {
        playNextPlaylistSong(queue, null);
    } else if (queue.loop === 'queue' && finishedSong) {
        queue.songs.shift();
        queue.songs.push(finishedSong);
        if (queue.songs.length > 0) {
            playNextPlaylistSong(queue, null);
        } else {
            queue.playing = false;
        }
    } else {
        queue.songs.shift();
        if (queue.songs.length > 0) {
            playNextPlaylistSong(queue, null);
        } else {
            queue.playing = false;
        }
    }
}