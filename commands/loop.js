const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Set loop mode for the queue')
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('Loop mode')
                .setRequired(true)
                .addChoices(
                    { name: 'Off', value: 'off' },
                    { name: 'Current Song', value: 'song' },
                    { name: 'Entire Queue', value: 'queue' }
                )),
    
    async execute(interaction) {
        const mode = interaction.options.getString('mode');
        const queue = interaction.client.queues.get(interaction.guildId);

        if (!queue || queue.songs.length === 0) {
            return interaction.reply('No music is currently playing!');
        }

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel || voiceChannel.id !== queue.voiceChannel?.id) {
            return interaction.reply('You need to be in the same voice channel as the bot!');
        }

        queue.setLoop(mode);

        const modeEmojis = {
            'off': '⏹️',
            'song': '🔂',
            'queue': '🔁'
        };

        const modeNames = {
            'off': 'Off',
            'song': 'Current Song',
            'queue': 'Entire Queue'
        };

        const embed = new EmbedBuilder()
            .setTitle(`${modeEmojis[mode]} Loop Mode Updated`)
            .setDescription(`Loop mode set to: **${modeNames[mode]}**`)
            .setColor('#e67e22');

        return interaction.reply({ embeds: [embed] });
    },
};