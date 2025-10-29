const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Set or view the music volume')
        .addIntegerOption(option =>
            option.setName('level')
                .setDescription('Volume level (0-100)')
                .setMinValue(0)
                .setMaxValue(100)
                .setRequired(false)),
    
    async execute(interaction) {
        const queue = interaction.client.queues.get(interaction.guildId);
        const volumeLevel = interaction.options.getInteger('level');

        if (!queue) {
            const embed = new EmbedBuilder()
                .setTitle('❌ No Music Session')
                .setDescription('No music is currently playing!')
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

        if (volumeLevel === null) {
            // Show current volume
            const embed = new EmbedBuilder()
                .setTitle('🔊 Current Volume')
                .setDescription(`Volume is set to **${queue.getVolumePercent()}%**`)
                .setColor('#0099ff')
                .addFields(
                    { name: 'Volume Bar', value: createVolumeBar(queue.getVolumePercent()), inline: false }
                );
            
            return interaction.reply({ embeds: [embed] });
        } else {
            // Set new volume
            const success = queue.setVolume(volumeLevel);
            
            if (success) {
                // Apply volume to current resource if playing
                if (queue.player && queue.player.state.resource) {
                    queue.player.state.resource.volume?.setVolume(queue.volume);
                }

                const embed = new EmbedBuilder()
                    .setTitle('🔊 Volume Updated')
                    .setDescription(`Volume set to **${volumeLevel}%**`)
                    .setColor('#00ff00')
                    .addFields(
                        { name: 'Volume Bar', value: createVolumeBar(volumeLevel), inline: false },
                        { name: 'Changed by', value: interaction.user.toString(), inline: true }
                    );
                
                return interaction.reply({ embeds: [embed] });
            } else {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Invalid Volume')
                    .setDescription('Volume must be between 0 and 100!')
                    .setColor('#ff0000');
                
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }
    },
};

function createVolumeBar(volume, length = 20) {
    const filled = Math.round((volume / 100) * length);
    const empty = length - filled;
    
    let bar = '';
    for (let i = 0; i < length; i++) {
        if (i < filled) {
            bar += '█';
        } else {
            bar += '░';
        }
    }
    
    return `${bar} ${volume}%`;
}