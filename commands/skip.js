const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current song'),
    
    async execute(interaction) {
        const queue = interaction.client.queues.get(interaction.guildId);

        if (!queue || !queue.playing) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Nothing to Skip')
                .setDescription('There is no song currently playing!')
                .setColor('#ff0000');
            
            return interaction.reply({ embeds: [embed] });
        }

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel || voiceChannel.id !== queue.voiceChannel?.id) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Voice Channel Required')
                .setDescription('You need to be in the same voice channel as the bot!')
                .setColor('#ff0000');
            
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const skippedSong = queue.songs[0];
        queue.player.stop();

        const embed = new EmbedBuilder()
            .setTitle('⏭️ Song Skipped')
            .setDescription(`**${skippedSong.title}**`)
            .setColor('#ff9900')
            .addFields(
                { name: 'Skipped by', value: interaction.user.toString(), inline: true },
                { name: 'Duration', value: formatDuration(skippedSong.duration), inline: true },
                { name: 'Next Song', value: queue.songs.length > 1 ? queue.songs[1].title : 'Queue empty', inline: false }
            );

        if (skippedSong.thumbnail) {
            embed.setThumbnail(skippedSong.thumbnail);
        }

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