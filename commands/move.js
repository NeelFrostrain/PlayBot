const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('move')
        .setDescription('Move a song to a different position in the queue')
        .addIntegerOption(option =>
            option.setName('from')
                .setDescription('Current position of the song')
                .setMinValue(1)
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('to')
                .setDescription('New position for the song')
                .setMinValue(1)
                .setRequired(true)),
    
    async execute(interaction) {
        const fromPosition = interaction.options.getInteger('from');
        const toPosition = interaction.options.getInteger('to');
        const queue = interaction.client.queues.get(interaction.guildId);

        if (!queue || queue.songs.length <= 1) {
            return interaction.reply('Need at least 2 songs in queue to move songs!');
        }

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel || voiceChannel.id !== queue.voiceChannel?.id) {
            return interaction.reply('You need to be in the same voice channel as the bot!');
        }

        const maxPosition = queue.songs.length - 1; // Don't count current song
        
        if (fromPosition > maxPosition || toPosition > maxPosition) {
            return interaction.reply(`Invalid position! Queue only has ${maxPosition} upcoming songs.`);
        }

        if (fromPosition === toPosition) {
            return interaction.reply('Source and destination positions are the same!');
        }

        // Convert to array indices (add 1 because position 1 = index 1)
        const fromIndex = fromPosition;
        const toIndex = toPosition;

        const movedSong = queue.songs[fromIndex];
        const success = queue.moveSong(fromIndex, toIndex);

        if (success) {
            const embed = new EmbedBuilder()
                .setTitle('📋 Song Moved')
                .setDescription(`Moved **${movedSong.title}** from position ${fromPosition} to position ${toPosition}`)
                .setColor('#3498db')
                .addFields(
                    { name: 'Requested by', value: movedSong.requestedBy.toString(), inline: true },
                    { name: 'Duration', value: formatDuration(movedSong.duration), inline: true }
                );
            
            if (movedSong.thumbnail) {
                embed.setThumbnail(movedSong.thumbnail);
            }
            
            return interaction.reply({ embeds: [embed] });
        } else {
            return interaction.reply('Failed to move the song!');
        }
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