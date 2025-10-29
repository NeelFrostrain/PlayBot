const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const backgroundDownloader = require('../utils/BackgroundDownloader');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop the music and clear the queue'),
    
    async execute(interaction) {
        const queue = interaction.client.queues.get(interaction.guildId);

        if (!queue || !queue.playing) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Nothing to Stop')
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

        const clearedSongs = queue.songs.length;
        const currentSong = queue.songs[0];

        queue.songs = [];
        queue.player.stop();
        queue.connection.destroy();
        
        // Stop background downloading
        backgroundDownloader.stopDownloading(interaction.guildId);
        
        interaction.client.queues.delete(interaction.guildId);

        const embed = new EmbedBuilder()
            .setTitle('⏹️ Music Stopped')
            .setDescription('Music stopped and queue cleared!')
            .setColor('#ff0000')
            .addFields(
                { name: 'Last Playing', value: currentSong ? currentSong.title : 'Unknown', inline: true },
                { name: 'Songs Cleared', value: clearedSongs.toString(), inline: true },
                { name: 'Stopped by', value: interaction.user.toString(), inline: true }
            );

        if (currentSong && currentSong.thumbnail) {
            embed.setThumbnail(currentSong.thumbnail);
        }

        return interaction.reply({ embeds: [embed] });
    },
};