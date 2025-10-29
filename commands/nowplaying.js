const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Show the currently playing song'),
    
    async execute(interaction) {
        const queue = interaction.client.queues.get(interaction.guildId);

        if (!queue || !queue.playing || queue.songs.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Nothing Playing')
                .setDescription('No song is currently playing!')
                .setColor('#ff0000');
            
            return interaction.reply({ embeds: [embed] });
        }

        const currentSong = queue.songs[0];
        const statusIcon = queue.paused ? '⏸️' : '🎵';
        const loopIcon = queue.loop === 'song' ? '🔂' : queue.loop === 'queue' ? '🔁' : '';
        const volumeBar = createVolumeBar(queue.getVolumePercent());
        const progressBar = createProgressBar(0, currentSong.duration); // You can add actual progress tracking later
        
        // Create a more stylish embed
        const embed = new EmbedBuilder()
            .setAuthor({ 
                name: `${statusIcon} Now Playing ${loopIcon}`, 
                iconURL: 'https://cdn.discordapp.com/emojis/741605543046807626.gif' 
            })
            .setTitle(currentSong.title)
            .setDescription(`
                ${progressBar}
                
                **🎤 Artist:** ${currentSong.uploader || 'Unknown'}
                **⏱️ Duration:** ${formatDuration(currentSong.duration)}
                **👤 Requested by:** ${currentSong.requestedBy}
                
                **🔊 Volume:** ${volumeBar}
                **🔄 Loop:** ${queue.loop === 'off' ? 'Off' : queue.loop === 'song' ? 'Song' : 'Queue'}
                **📋 Queue:** ${queue.songs.length} song${queue.songs.length !== 1 ? 's' : ''}
            `)
            .setColor(queue.paused ? '#FFA500' : '#1DB954')
            .setFooter({ 
                text: `Added ${getTimeAgo(currentSong.addedAt)} • ${queue.paused ? 'Paused' : 'Playing'}`,
                iconURL: currentSong.requestedBy.displayAvatarURL({ size: 32 })
            })
            .setTimestamp();

        if (currentSong.thumbnail) {
            embed.setImage(currentSong.thumbnail);
        }

        // Add URL if available
        if (currentSong.url) {
            embed.setURL(currentSong.url);
        }

        // Create stylish control buttons
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('music_pause')
                    .setLabel(queue.paused ? 'Resume' : 'Pause')
                    .setEmoji(queue.paused ? '▶️' : '⏸️')
                    .setStyle(queue.paused ? ButtonStyle.Success : ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_skip')
                    .setLabel('Skip')
                    .setEmoji('⏭️')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('music_stop')
                    .setLabel('Stop')
                    .setEmoji('⏹️')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('music_shuffle')
                    .setLabel('Shuffle')
                    .setEmoji('�')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_loop')
                    .setLabel('Loop')
                    .setEmoji(queue.loop === 'off' ? '➡️' : queue.loop === 'song' ? '🔂' : '🔁')
                    .setStyle(queue.loop === 'off' ? ButtonStyle.Secondary : ButtonStyle.Success)
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('music_volume_down')
                    .setLabel('Vol-')
                    .setEmoji('🔉')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_volume_up')
                    .setLabel('Vol+')
                    .setEmoji('🔊')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_queue')
                    .setLabel('Queue')
                    .setEmoji('📋')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_refresh')
                    .setLabel('Refresh')
                    .setEmoji('🔄')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setLabel('YouTube')
                    .setEmoji('🎬')
                    .setStyle(ButtonStyle.Link)
                    .setURL(currentSong.url || 'https://youtube.com')
            );

        return interaction.reply({ embeds: [embed], components: [row1, row2] });
    },
};

function formatDuration(seconds) {
    if (!seconds || seconds === 0) return '0:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function createVolumeBar(volume, length = 12) {
    const filled = Math.round((volume / 100) * length);
    const empty = length - filled;
    
    let bar = '';
    for (let i = 0; i < length; i++) {
        if (i < filled) {
            bar += '🟩';
        } else {
            bar += '⬜';
        }
    }
    
    return `${bar} **${volume}%**`;
}

function createProgressBar(currentTime = 0, totalTime, length = 20) {
    if (!totalTime || totalTime === 0) {
        return '🎵 ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬ 🎵';
    }
    
    const progress = Math.min(currentTime / totalTime, 1);
    const filled = Math.round(progress * length);
    const empty = length - filled;
    
    let bar = '🎵 ';
    for (let i = 0; i < length; i++) {
        if (i < filled) {
            bar += '▬';
        } else if (i === filled) {
            bar += '🔘';
        } else {
            bar += '▬';
        }
    }
    bar += ' 🎵';
    
    return bar;
}

function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
        return 'just now';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
}