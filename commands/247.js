const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus, entersState } = require('@discordjs/voice');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('247')
        .setDescription('Toggle 24/7 mode - keeps bot in voice channel')
        .addSubcommand(subcommand =>
            subcommand
                .setName('on')
                .setDescription('Enable 24/7 mode - bot stays in voice channel'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('off')
                .setDescription('Disable 24/7 mode - bot can leave when queue is empty'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check current 24/7 mode status'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const voiceChannel = interaction.member.voice.channel;

        // Initialize 24/7 settings if not exists
        if (!interaction.client.settings247) {
            interaction.client.settings247 = new Map();
        }

        const guildSettings = interaction.client.settings247.get(interaction.guildId) || {
            enabled: false,
            channelId: null,
            connection: null
        };

        switch (subcommand) {
            case 'on':
                if (!voiceChannel) {
                    const embed = new EmbedBuilder()
                        .setTitle('❌ Voice Channel Required')
                        .setDescription('You need to be in a voice channel to enable 24/7 mode!')
                        .setColor('#ff0000');
                    
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }

                try {
                    // Join the voice channel
                    const connection = joinVoiceChannel({
                        channelId: voiceChannel.id,
                        guildId: interaction.guildId,
                        adapterCreator: interaction.guild.voiceAdapterCreator,
                    });

                    await entersState(connection, VoiceConnectionStatus.Ready, 30000);

                    // Update settings
                    guildSettings.enabled = true;
                    guildSettings.channelId = voiceChannel.id;
                    guildSettings.connection = connection;
                    interaction.client.settings247.set(interaction.guildId, guildSettings);

                    // Handle connection events
                    connection.on(VoiceConnectionStatus.Disconnected, async () => {
                        if (guildSettings.enabled) {
                            // Try to reconnect after a short delay
                            setTimeout(async () => {
                                try {
                                    const channel = interaction.guild.channels.cache.get(guildSettings.channelId);
                                    if (channel && channel.isVoiceBased()) {
                                        const newConnection = joinVoiceChannel({
                                            channelId: channel.id,
                                            guildId: interaction.guildId,
                                            adapterCreator: interaction.guild.voiceAdapterCreator,
                                        });
                                        guildSettings.connection = newConnection;
                                        interaction.client.settings247.set(interaction.guildId, guildSettings);
                                    }
                                } catch (error) {
                                    console.error('Failed to reconnect in 24/7 mode:', error);
                                }
                            }, 5000);
                        }
                    });

                    const embed = new EmbedBuilder()
                        .setTitle('✅ 24/7 Mode Enabled')
                        .setDescription(`Bot will stay connected to **${voiceChannel.name}**`)
                        .setColor('#00ff00')
                        .addFields(
                            { name: 'Channel', value: voiceChannel.name, inline: true },
                            { name: 'Status', value: '🟢 Active', inline: true },
                            { name: 'Auto-reconnect', value: '✅ Enabled', inline: true }
                        )
                        .setTimestamp();

                    return interaction.reply({ embeds: [embed] });

                } catch (error) {
                    console.error('Failed to enable 24/7 mode:', error);
                    
                    const embed = new EmbedBuilder()
                        .setTitle('❌ Failed to Enable 24/7 Mode')
                        .setDescription('Could not connect to the voice channel!')
                        .setColor('#ff0000')
                        .addFields({
                            name: 'Error',
                            value: error.message,
                            inline: false
                        });

                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }

            case 'off':
                if (!guildSettings.enabled) {
                    const embed = new EmbedBuilder()
                        .setTitle('ℹ️ 24/7 Mode Already Disabled')
                        .setDescription('24/7 mode is not currently active!')
                        .setColor('#ffaa00');
                    
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }

                // Disable 24/7 mode
                guildSettings.enabled = false;
                
                // Disconnect if no music is playing
                const queue = interaction.client.queues?.get(interaction.guildId);
                if (!queue || !queue.playing) {
                    if (guildSettings.connection) {
                        guildSettings.connection.destroy();
                        guildSettings.connection = null;
                    }
                }

                guildSettings.channelId = null;
                interaction.client.settings247.set(interaction.guildId, guildSettings);

                const embed = new EmbedBuilder()
                    .setTitle('✅ 24/7 Mode Disabled')
                    .setDescription('Bot will now leave voice channels when the queue is empty')
                    .setColor('#00ff00')
                    .addFields(
                        { name: 'Status', value: '🔴 Disabled', inline: true },
                        { name: 'Auto-leave', value: '✅ Enabled', inline: true }
                    )
                    .setTimestamp();

                return interaction.reply({ embeds: [embed] });

            case 'status':
                const statusEmbed = new EmbedBuilder()
                    .setTitle('📊 24/7 Mode Status')
                    .setColor(guildSettings.enabled ? '#00ff00' : '#ff0000')
                    .addFields(
                        { 
                            name: 'Status', 
                            value: guildSettings.enabled ? '🟢 Enabled' : '🔴 Disabled', 
                            inline: true 
                        }
                    );

                if (guildSettings.enabled && guildSettings.channelId) {
                    const channel = interaction.guild.channels.cache.get(guildSettings.channelId);
                    statusEmbed.addFields(
                        { name: 'Channel', value: channel ? channel.name : 'Unknown', inline: true },
                        { name: 'Connection', value: guildSettings.connection ? '🟢 Connected' : '🔴 Disconnected', inline: true }
                    );
                } else {
                    statusEmbed.addFields(
                        { name: 'Channel', value: 'None', inline: true },
                        { name: 'Connection', value: 'None', inline: true }
                    );
                }

                statusEmbed.setTimestamp();

                return interaction.reply({ embeds: [statusEmbed] });
        }
    },
};