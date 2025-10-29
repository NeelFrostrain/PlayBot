const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clear the entire queue (keeps current song playing)'),
    
    async execute(interaction) {
        const queue = interaction.client.queues.get(interaction.guildId);

        if (!queue || queue.songs.length <= 1) {
            return interaction.reply('The queue is already empty!');
        }

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel || voiceChannel.id !== queue.voiceChannel?.id) {
            return interaction.reply('You need to be in the same voice channel as the bot!');
        }

        const currentSong = queue.getCurrentSong();
        const clearedCount = queue.songs.length - 1; // Don't count current song
        
        // Keep only the current song
        queue.songs = currentSong ? [currentSong] : [];

        const embed = new EmbedBuilder()
            .setTitle('🧹 Queue Cleared')
            .setDescription(`Removed **${clearedCount}** songs from the queue`)
            .setColor('#f39c12');

        if (currentSong) {
            embed.addFields({
                name: 'Still Playing',
                value: `**${currentSong.title}**`,
                inline: false
            });
        }

        return interaction.reply({ embeds: [embed] });
    },
};