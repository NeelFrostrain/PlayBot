const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const YtDlpManager = require('../utils/YtDlpManager');

const ytdlp = new YtDlpManager();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('debug')
        .setDescription('Debug music bot functionality')
        .addStringOption(option =>
            option.setName('url')
                .setDescription('YouTube URL to test')
                .setRequired(true)),
    
    async execute(interaction) {
        const url = interaction.options.getString('url');
        
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: 'This command requires Administrator permissions!', ephemeral: true });
        }

        await interaction.deferReply();

        const embed = new EmbedBuilder()
            .setTitle('🔧 Debug Information')
            .setColor('#ff9900');

        let debugInfo = '';

        // Test yt-dlp availability
        try {
            debugInfo += '**yt-dlp Availability:**\n';
            const isAvailable = await ytdlp.checkYtDlp();
            debugInfo += `✅ yt-dlp Available: ${isAvailable}\n`;
            
            if (isAvailable) {
                const info = await ytdlp.getVideoInfo(url);
                debugInfo += `✅ Title: ${info.title}\n`;
                debugInfo += `✅ Duration: ${info.duration}s\n`;
                debugInfo += `✅ Uploader: ${info.uploader}\n`;
                debugInfo += `✅ File Size: ~${ytdlp.getFileSizeMB(info.filesize || 0)} MB\n`;
            } else {
                debugInfo += `❌ yt-dlp not found in PATH\n`;
                debugInfo += `📥 Install: https://github.com/yt-dlp/yt-dlp/releases\n`;
            }
        } catch (error) {
            debugInfo += `❌ yt-dlp Error: ${error.message}\n`;
        }

        debugInfo += '\n';

        // Voice channel info
        const voiceChannel = interaction.member.voice.channel;
        debugInfo += '**Voice Channel:**\n';
        if (voiceChannel) {
            debugInfo += `✅ Connected to: ${voiceChannel.name}\n`;
            debugInfo += `✅ Channel ID: ${voiceChannel.id}\n`;
            debugInfo += `✅ Permissions: ${voiceChannel.permissionsFor(interaction.guild.members.me).has(['Connect', 'Speak']) ? 'OK' : 'Missing'}\n`;
        } else {
            debugInfo += `❌ Not in voice channel\n`;
        }

        debugInfo += '\n';

        // Queue info
        const queue = interaction.client.queues.get(interaction.guildId);
        debugInfo += '**Queue Status:**\n';
        if (queue) {
            debugInfo += `✅ Queue exists\n`;
            debugInfo += `✅ Songs: ${queue.songs.length}\n`;
            debugInfo += `✅ Playing: ${queue.playing}\n`;
            debugInfo += `✅ Connection: ${queue.connection ? 'Active' : 'None'}\n`;
        } else {
            debugInfo += `❌ No active queue\n`;
        }

        embed.setDescription(debugInfo);
        
        return interaction.editReply({ embeds: [embed] });
    },
};