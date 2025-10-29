const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Shuffle the current queue'),
    
    async execute(interaction) {
        const queue = interaction.client.queues.get(interaction.guildId);

        if (!queue || queue.songs.length <= 1) {
            return interaction.reply('Need at least 2 songs in queue to shuffle!');
        }

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel || voiceChannel.id !== queue.voiceChannel?.id) {
            return interaction.reply('You need to be in the same voice channel as the bot!');
        }

        const shuffled = queue.shuffle();
        
        if (shuffled) {
            const embed = new EmbedBuilder()
                .setTitle('🔀 Queue Shuffled')
                .setDescription(`Successfully shuffled ${queue.songs.length - 1} songs in the queue!`)
                .setColor('#9b59b6');
            
            return interaction.reply({ embeds: [embed] });
        } else {
            return interaction.reply('Failed to shuffle the queue!');
        }
    },
};