const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { AudioPlayerStatus } = require('@discordjs/voice');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pause or resume the current song'),
    
    async execute(interaction) {
        const queue = interaction.client.queues.get(interaction.guildId);

        if (!queue || !queue.playing) {
            return interaction.reply('No music is currently playing!');
        }

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel || voiceChannel.id !== queue.voiceChannel?.id) {
            return interaction.reply('You need to be in the same voice channel as the bot!');
        }

        const currentSong = queue.getCurrentSong();
        if (!currentSong) {
            return interaction.reply('No song is currently playing!');
        }

        let embed;
        
        if (queue.paused) {
            // Resume
            queue.player.unpause();
            queue.paused = false;
            
            embed = new EmbedBuilder()
                .setTitle('▶️ Resumed')
                .setDescription(`**${currentSong.title}**`)
                .setColor('#2ecc71');
        } else {
            // Pause
            queue.player.pause();
            queue.paused = true;
            
            embed = new EmbedBuilder()
                .setTitle('⏸️ Paused')
                .setDescription(`**${currentSong.title}**`)
                .setColor('#f39c12');
        }

        if (currentSong.thumbnail) {
            embed.setThumbnail(currentSong.thumbnail);
        }

        return interaction.reply({ embeds: [embed] });
    },
};