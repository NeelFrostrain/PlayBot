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
        const statusIcon = queue.paused ? '⏸️' : '▶️';
        const loopIcon = queue.loop === 'song' ? '🔂' : queue.loop === 'queue' ? '🔁' : '';
        const volumeBar = createVolumeBar(queue.getVolumePercent());
        
        const embed = new EmbedBuilder()
            .setTitle(`${statusIcon} Now Playing ${loopIcon}`)
            .setDescription(`**${currentSong.title}**`)
            .setColor(queue.paused ? '#ff9900' : '#00ff00')
            .addFields(
                { name: 'Duration', value: formatDuration(currentSong.duration), inline: true },
                { name: 'Requested by', value: currentSong.requestedBy.toString(), inline: true },
                { name: 'Uploader', value: currentSong.uploader || 'Unknown', inline: true },
                { name: 'Volume', value: volumeBar, inline: false },
                { name: 'Loop Mode', value: queue.loop === 'off' ? 'Off' : queue.loop === 'song' ? 'Song' : 'Queue', inline: true },
                { name: 'Queue Position', value: `1 of ${queue.songs.length}`, inline: true },
                { name: 'Status', value: queue.paused ? 'Paused' : 'Playing', inline: true }
            );

        if (currentSong.thumbnail) {
            embed.setThumbnail(currentSong.thumbnail);
        }

        // Add URL if available
        if (currentSong.url) {
            embed.setURL(currentSong.url);
        }

        embed.setTimestamp(currentSong.addedAt);
        embed.setFooter({ text: 'Added to queue' });

        // Add quick control buttons
        const row = new ActionRowBuilder()
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
                    .setCustomId('music_volume_up')
                    .setLabel('Vol+')
                    .setEmoji('🔊')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_volume_down')
                    .setLabel('Vol-')
                    .setEmoji('🔉')
                    .setStyle(ButtonStyle.Secondary)
            );

        return interaction.reply({ embeds: [embed], components: [row] });
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