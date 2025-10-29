const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Remove a song from the queue')
        .addIntegerOption(option =>
            option.setName('position')
                .setDescription('Position of the song to remove (1 = next song)')
                .setMinValue(1)
                .setRequired(true)),
    
    async execute(interaction) {
        const position = interaction.options.getInteger('position');
        const queue = interaction.client.queues.get(interaction.guildId);

        if (!queue || queue.songs.length === 0) {
            return interaction.reply('The queue is empty!');
        }

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel || voiceChannel.id !== queue.voiceChannel?.id) {
            return interaction.reply('You need to be in the same voice channel as the bot!');
        }

        // Position 1 = index 1 (since index 0 is currently playing)
        const songIndex = position;
        
        if (songIndex >= queue.songs.length) {
            return interaction.reply(`Invalid position! Queue only has ${queue.songs.length - 1} upcoming songs.`);
        }

        if (songIndex === 0) {
            return interaction.reply('Cannot remove the currently playing song! Use `/skip` instead.');
        }

        const removedSong = queue.removeSong(songIndex);
        
        if (removedSong) {
            const embed = new EmbedBuilder()
                .setTitle('🗑️ Song Removed')
                .setDescription(`Removed **${removedSong.title}** from position ${position}`)
                .setColor('#e74c3c')
                .addFields(
                    { name: 'Requested by', value: removedSong.requestedBy.toString(), inline: true },
                    { name: 'Duration', value: formatDuration(removedSong.duration), inline: true }
                );
            
            if (removedSong.thumbnail) {
                embed.setThumbnail(removedSong.thumbnail);
            }
            
            return interaction.reply({ embeds: [embed] });
        } else {
            return interaction.reply('Failed to remove the song from queue!');
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