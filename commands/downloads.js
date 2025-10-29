const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const backgroundDownloader = require('../utils/BackgroundDownloader');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('downloads')
        .setDescription('Show background download status'),
    
    async execute(interaction) {
        const queue = interaction.client.queues.get(interaction.guildId);

        if (!queue || queue.songs.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle('📥 Download Status')
                .setDescription('No active queue found!')
                .setColor('#ff0000');
            
            return interaction.reply({ embeds: [embed] });
        }

        const downloadStatus = backgroundDownloader.getDownloadStatus(interaction.guildId);
        
        // Count downloaded and pending songs
        let downloadedCount = 0;
        let downloadingCount = 0;
        let pendingCount = 0;

        queue.songs.forEach((song, index) => {
            if (index === 0) return; // Skip currently playing song
            
            if (song.filepath) {
                downloadedCount++;
            } else if (song.downloading) {
                downloadingCount++;
            } else {
                pendingCount++;
            }
        });

        const embed = new EmbedBuilder()
            .setTitle('📥 Background Download Status')
            .setColor(downloadStatus.active ? '#00ff00' : '#ff9900')
            .addFields(
                { name: 'Download Service', value: downloadStatus.active ? '✅ Active' : '⏸️ Inactive', inline: true },
                { name: 'Total Queue', value: `${queue.songs.length} songs`, inline: true },
                { name: 'Currently Playing', value: queue.songs[0]?.title || 'None', inline: false },
                { name: '✅ Downloaded', value: downloadedCount.toString(), inline: true },
                { name: '📥 Downloading', value: downloadingCount.toString(), inline: true },
                { name: '⏳ Pending', value: pendingCount.toString(), inline: true }
            );

        // Show next few songs and their status
        const upcomingSongs = queue.songs.slice(1, 6); // Next 5 songs
        if (upcomingSongs.length > 0) {
            const songList = upcomingSongs.map((song, index) => {
                let status = '⏳ Pending';
                if (song.filepath) {
                    status = '✅ Ready';
                } else if (song.downloading) {
                    status = '📥 Downloading';
                }
                
                return `${index + 2}. **${song.title}** - ${status}`;
            }).join('\n');

            embed.addFields({
                name: 'Upcoming Songs',
                value: songList,
                inline: false
            });
        }

        embed.setTimestamp();
        embed.setFooter({ text: 'Background downloads happen automatically' });

        return interaction.reply({ embeds: [embed] });
    },
};