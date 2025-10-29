const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Show the current music queue')
        .addIntegerOption(option =>
            option.setName('page')
                .setDescription('Page number to view')
                .setMinValue(1)
                .setRequired(false)),
    
    async execute(interaction) {
        const queue = interaction.client.queues.get(interaction.guildId);
        const page = interaction.options.getInteger('page') || 1;

        if (!queue || queue.songs.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle('📭 Queue is Empty')
                .setDescription('No songs in queue. Use `/play` to add some music!')
                .setColor('#ff6b6b');
            return interaction.reply({ embeds: [embed] });
        }

        const songsPerPage = 10;
        const totalPages = Math.ceil((queue.songs.length - 1) / songsPerPage);
        const currentPage = Math.min(Math.max(1, page), totalPages || 1);

        const embed = new EmbedBuilder()
            .setTitle('🎵 Music Queue')
            .setColor('#0099ff');

        let description = '';
        
        // Show currently playing song
        const currentSong = queue.getCurrentSong();
        if (currentSong && queue.playing) {
            const loopIcon = queue.loop === 'song' ? '🔂' : queue.loop === 'queue' ? '🔁' : '';
            const pauseIcon = queue.paused ? '⏸️' : '▶️';
            description += `${pauseIcon} **Now Playing:** ${loopIcon}\n`;
            description += `**${currentSong.title}**\n`;
            description += `*Duration: ${formatDuration(currentSong.duration)} | Requested by: ${currentSong.requestedBy.username}*\n\n`;
        }

        // Show upcoming songs
        const upcomingSongs = queue.getUpcoming();
        if (upcomingSongs.length > 0) {
            description += '**Up Next:**\n';
            
            const startIndex = (currentPage - 1) * songsPerPage;
            const endIndex = Math.min(startIndex + songsPerPage, upcomingSongs.length);
            
            for (let i = startIndex; i < endIndex; i++) {
                const song = upcomingSongs[i];
                const position = i + 2; // +2 because index 0 is current song, and we want 1-based numbering
                description += `\`${position.toString().padStart(2, '0')}.\` **${song.title}**\n`;
                description += `     *${formatDuration(song.duration)} | ${song.requestedBy.username}*\n`;
            }
            
            if (upcomingSongs.length > endIndex) {
                description += `\n*... and ${upcomingSongs.length - endIndex} more songs*`;
            }
        }

        // Queue statistics
        const totalDuration = queue.getTotalDuration();
        const queueInfo = [
            `**Total Songs:** ${queue.getQueueSize()}`,
            `**Total Duration:** ${formatDuration(totalDuration)}`,
            `**Loop Mode:** ${queue.loop === 'off' ? 'Off' : queue.loop === 'song' ? 'Song' : 'Queue'}`,
            totalPages > 1 ? `**Page:** ${currentPage}/${totalPages}` : ''
        ].filter(Boolean).join(' | ');

        embed.setDescription(description);
        embed.setFooter({ text: queueInfo });

        // Add navigation buttons if multiple pages
        const components = [];
        if (totalPages > 1) {
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`queue_prev_${currentPage}`)
                        .setLabel('◀️ Previous')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage === 1),
                    new ButtonBuilder()
                        .setCustomId(`queue_next_${currentPage}`)
                        .setLabel('Next ▶️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage === totalPages),
                    new ButtonBuilder()
                        .setCustomId('queue_refresh')
                        .setLabel('🔄 Refresh')
                        .setStyle(ButtonStyle.Primary)
                );
            components.push(row);
        }

        return interaction.reply({ embeds: [embed], components });
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