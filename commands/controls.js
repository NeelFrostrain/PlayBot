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
            .setTitle('🎛️ Music Control Panel')
            .setColor('#3498db');

        if (currentSong) {
            const statusIcon = queue.paused ? '⏸️' : '▶️';
            const loopIcon = queue.loop === 'song' ? '🔂' : queue.loop === 'queue' ? '🔁' : '➡️';
            const volumeBar = createVolumeBar(queue.getVolumePercent());
            
            embed.setDescription(`${statusIcon} **${currentSong.title}**`)
                .addFields(
                    { name: 'Duration', value: formatDuration(currentSong.duration), inline: true },
                    { name: 'Requested by', value: currentSong.requestedBy.username, inline: true },
                    { name: 'Uploader', value: currentSong.uploader || 'Unknown', inline: true },
                    { name: 'Loop Mode', value: `${loopIcon} ${queue.loop === 'off' ? 'Off' : queue.loop === 'song' ? 'Song' : 'Queue'}`, inline: true },
                    { name: 'Queue Length', value: `${queue.getQueueSize()} songs`, inline: true },
                    { name: 'Status', value: queue.paused ? '⏸️ Paused' : '▶️ Playing', inline: true },
                    { name: 'Volume', value: volumeBar, inline: false },
                    { name: 'Total Duration', value: formatDuration(queue.getTotalDuration()), inline: true }
                );

            if (currentSong.thumbnail) {
                embed.setThumbnail(currentSong.thumbnail);
            }
        }

        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('music_pause')
                    .setLabel(queue.paused ? 'Resume' : 'Pause')
                    .setEmoji(queue.paused ? '▶️' : '⏸️')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('music_skip')
                    .setLabel('Skip')
                    .setEmoji('⏭️')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_stop')
                    .setLabel('Stop')
                    .setEmoji('⏹️')
                    .setStyle(ButtonStyle.Danger)
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('music_volume_down')
                    .setLabel('Vol -')
                    .setEmoji('🔉')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_volume_up')
                    .setLabel('Vol +')
                    .setEmoji('🔊')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_shuffle')
                    .setLabel('Shuffle')
                    .setEmoji('🔀')
                    .setStyle(ButtonStyle.Secondary)
            );

        const row3 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('music_loop')
                    .setLabel('Loop')
                    .setEmoji(queue.loop === 'song' ? '🔂' : queue.loop === 'queue' ? '🔁' : '➡️')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_queue')
                    .setLabel('Queue')
                    .setEmoji('📜')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_refresh')
                    .setLabel('Refresh')
                    .setEmoji('🔄')
                    .setStyle(ButtonStyle.Secondary)
            );

        embed.setTimestamp();
        embed.setFooter({ text: 'Use buttons to control playback' });

        return interaction.reply({ embeds: [embed], components: [row1, row2, row3] });
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

function createVolumeBar(volume, length = 15) {
    const filled = Math.round((volume / 100) * length);
    const empty = length - filled;
    
    let bar = '';
    for (let i = 0; i < length; i++) {
        if (i < filled) {
            bar += '█';
        } else {
            bar += '░';
        }
    }
    
    return `${bar} ${volume}%`;
}