const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('controls')
        .setDescription('Show music control panel'),
    
    async execute(interaction) {
        const queue = interaction.client.queues.get(interaction.guildId);

        if (!queue || queue.songs.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle('❌ No Music Session')
                .setDescription('No music is currently playing!')
                .setColor('#ff0000');
            
            return interaction.reply({ embeds: [embed] });
        }

        const currentSong = queue.getCurrentSong();
        const embed = new EmbedBuilder()
            .setAuthor({ 
                name: '🎛️ Music Control Panel', 
                iconURL: 'https://cdn.discordapp.com/emojis/742094927403065374.png' 
            })
            .setColor('#1DB954');

        if (currentSong) {
            const statusIcon = queue.paused ? '⏸️' : '🎵';
            const loopIcon = queue.loop === 'song' ? '🔂' : queue.loop === 'queue' ? '🔁' : '➡️';
            const volumeBar = createVolumeBar(queue.getVolumePercent());
            const progressBar = createProgressBar();
            
            embed.setTitle(currentSong.title)
                .setDescription(`
                    ${progressBar}
                    
                    **🎤 Artist:** ${currentSong.uploader || 'Unknown'}
                    **⏱️ Duration:** ${formatDuration(currentSong.duration)}
                    **👤 Requested by:** ${currentSong.requestedBy}
                    
                    **🔊 Volume:** ${volumeBar}
                    **🔄 Loop:** ${loopIcon} ${queue.loop === 'off' ? 'Off' : queue.loop === 'song' ? 'Song' : 'Queue'}
                    **📋 Queue:** ${queue.getQueueSize()} songs (${formatDuration(queue.getTotalDuration())} total)
                    **▶️ Status:** ${queue.paused ? '⏸️ Paused' : '🎵 Playing'}
                `);

            if (currentSong.thumbnail) {
                embed.setImage(currentSong.thumbnail);
            }
            
            if (currentSong.url) {
                embed.setURL(currentSong.url);
            }
        }

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
                    .setEmoji('🔀')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_loop')
                    .setLabel('Loop')
                    .setEmoji(queue.loop === 'song' ? '🔂' : queue.loop === 'queue' ? '🔁' : '➡️')
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

        embed.setTimestamp();
        embed.setFooter({ 
            text: 'Use buttons to control playback',
            iconURL: interaction.user.displayAvatarURL({ size: 32 })
        });

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
    return '🎵 ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬ 🎵';
}