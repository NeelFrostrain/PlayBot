const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('history')
        .setDescription('Show recently played songs')
        .addIntegerOption(option =>
            option.setName('limit')
                .setDescription('Number of songs to show (max 20)')
                .setMinValue(1)
                .setMaxValue(20)
                .setRequired(false)),
    
    async execute(interaction) {
        const limit = interaction.options.getInteger('limit') || 10;
        const queue = interaction.client.queues.get(interaction.guildId);

        if (!queue) {
            return interaction.reply('No music session found for this server!');
        }

        const history = queue.getHistory(limit);
        
        if (history.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle('📜 Play History')
                .setDescription('No songs have been played yet!')
                .setColor('#95a5a6');
            
            return interaction.reply({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
            .setTitle('📜 Recently Played Songs')
            .setColor('#9b59b6');

        let description = '';
        history.forEach((song, index) => {
            description += `\`${(index + 1).toString().padStart(2, '0')}.\` **${song.title}**\n`;
            description += `     *${formatDuration(song.duration)} | ${song.requestedBy.username}*\n`;
        });

        embed.setDescription(description);
        embed.setFooter({ text: `Showing ${history.length} of ${queue.history.length} recent songs` });

        return interaction.reply({ embeds: [embed] });
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