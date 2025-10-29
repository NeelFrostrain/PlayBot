const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const YtDlpManager = require('../utils/YtDlpManager');
const fileCleanup = require('../utils/FileCleanup');
const fs = require('fs-extra');
const path = require('path');

const ytdlp = new YtDlpManager();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cleanup')
        .setDescription('Manage downloaded audio files')
        .addSubcommand(subcommand =>
            subcommand
                .setName('old')
                .setDescription('Clean up files older than specified hours')
                .addIntegerOption(option =>
                    option.setName('hours')
                        .setDescription('Delete files older than this many hours (default: 24)')
                        .setMinValue(1)
                        .setMaxValue(168)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('all')
                .setDescription('Delete all downloaded files'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Show information about downloaded files'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('force')
                .setDescription('Force cleanup of stuck files')),
    
    async execute(interaction) {
        // Check if user has administrator permissions
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ 
                content: 'This command requires Administrator permissions!', 
                ephemeral: true 
            });
        }

        const subcommand = interaction.options.getSubcommand();
        await interaction.deferReply();

        try {
            const downloadDir = path.join(__dirname, '..', 'downloads');
            
            // Ensure download directory exists
            await fs.ensureDir(downloadDir);

            switch (subcommand) {
                case 'info':
                    await handleInfo(interaction, downloadDir);
                    break;
                case 'old':
                    const hours = interaction.options.getInteger('hours') || 24;
                    await handleCleanupOld(interaction, downloadDir, hours);
                    break;
                case 'all':
                    await handleCleanupAll(interaction, downloadDir);
                    break;
                case 'force':
                    await handleForceCleanup(interaction);
                    break;
            }

        } catch (error) {
            console.error('Cleanup command error:', error);
            return interaction.editReply(`An error occurred: ${error.message}`);
        }
    },
};

async function handleInfo(interaction, downloadDir) {
    try {
        const files = await fs.readdir(downloadDir);
        const audioFiles = files.filter(file => file.endsWith('.mp3'));
        
        if (audioFiles.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle('📁 Download Directory Info')
                .setDescription('No downloaded files found.')
                .setColor('#0099ff');
            
            return interaction.editReply({ embeds: [embed] });
        }

        let totalSize = 0;
        const fileInfos = [];

        for (const file of audioFiles) {
            const filepath = path.join(downloadDir, file);
            const stats = await fs.stat(filepath);
            totalSize += stats.size;
            
            const ageHours = Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60));
            fileInfos.push({
                name: file,
                size: stats.size,
                age: ageHours
            });
        }

        // Sort by age (newest first)
        fileInfos.sort((a, b) => a.age - b.age);

        const embed = new EmbedBuilder()
            .setTitle('📁 Download Directory Info')
            .setColor('#0099ff')
            .addFields(
                { name: 'Total Files', value: audioFiles.length.toString(), inline: true },
                { name: 'Total Size', value: `${(totalSize / (1024 * 1024)).toFixed(2)} MB`, inline: true },
                { name: 'Directory', value: downloadDir, inline: false }
            );

        // Show recent files
        const recentFiles = fileInfos.slice(0, 10).map(file => 
            `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB, ${file.age}h old)`
        ).join('\n');

        if (recentFiles) {
            embed.addFields({
                name: 'Recent Files',
                value: recentFiles.length > 1000 ? recentFiles.substring(0, 1000) + '...' : recentFiles,
                inline: false
            });
        }

        // Add pending deletions info
        const cleanupStatus = fileCleanup.getStatus();
        if (cleanupStatus.pending > 0) {
            embed.addFields({
                name: 'Pending Deletions',
                value: `${cleanupStatus.pending} files waiting to be deleted`,
                inline: true
            });
        }

        return interaction.editReply({ embeds: [embed] });

    } catch (error) {
        throw new Error(`Failed to get directory info: ${error.message}`);
    }
}

async function handleCleanupOld(interaction, downloadDir, hours) {
    try {
        const files = await fs.readdir(downloadDir);
        const audioFiles = files.filter(file => file.endsWith('.mp3'));
        const maxAge = hours * 60 * 60 * 1000; // Convert to milliseconds
        const now = Date.now();

        let deletedCount = 0;
        let freedSpace = 0;

        for (const file of audioFiles) {
            const filepath = path.join(downloadDir, file);
            const stats = await fs.stat(filepath);
            
            if (now - stats.mtime.getTime() > maxAge) {
                freedSpace += stats.size;
                await fs.remove(filepath);
                deletedCount++;
            }
        }

        const embed = new EmbedBuilder()
            .setTitle('🧹 Cleanup Complete')
            .setColor(deletedCount > 0 ? '#00ff00' : '#0099ff')
            .addFields(
                { name: 'Files Deleted', value: deletedCount.toString(), inline: true },
                { name: 'Space Freed', value: `${(freedSpace / (1024 * 1024)).toFixed(2)} MB`, inline: true },
                { name: 'Age Threshold', value: `${hours} hours`, inline: true }
            );

        if (deletedCount === 0) {
            embed.setDescription('No files older than the specified threshold were found.');
        } else {
            embed.setDescription(`Successfully deleted ${deletedCount} files older than ${hours} hours.`);
        }

        return interaction.editReply({ embeds: [embed] });

    } catch (error) {
        throw new Error(`Failed to cleanup old files: ${error.message}`);
    }
}

async function handleCleanupAll(interaction, downloadDir) {
    try {
        const files = await fs.readdir(downloadDir);
        const audioFiles = files.filter(file => file.endsWith('.mp3'));

        if (audioFiles.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle('🧹 Cleanup Complete')
                .setDescription('No files to delete.')
                .setColor('#0099ff');
            
            return interaction.editReply({ embeds: [embed] });
        }

        let totalSize = 0;
        for (const file of audioFiles) {
            const filepath = path.join(downloadDir, file);
            const stats = await fs.stat(filepath);
            totalSize += stats.size;
            await fs.remove(filepath);
        }

        const embed = new EmbedBuilder()
            .setTitle('🧹 Cleanup Complete')
            .setDescription(`Successfully deleted all ${audioFiles.length} downloaded files.`)
            .setColor('#00ff00')
            .addFields(
                { name: 'Files Deleted', value: audioFiles.length.toString(), inline: true },
                { name: 'Space Freed', value: `${(totalSize / (1024 * 1024)).toFixed(2)} MB`, inline: true }
            );

        return interaction.editReply({ embeds: [embed] });

    } catch (error) {
        throw new Error(`Failed to cleanup all files: ${error.message}`);
    }
}

async function handleForceCleanup(interaction) {
    try {
        const cleanupStatus = fileCleanup.getStatus();
        
        if (cleanupStatus.pending === 0) {
            const embed = new EmbedBuilder()
                .setTitle('🧹 Force Cleanup')
                .setDescription('No files are pending deletion.')
                .setColor('#0099ff');
            
            return interaction.editReply({ embeds: [embed] });
        }

        const result = await fileCleanup.forceCleanup();

        const embed = new EmbedBuilder()
            .setTitle('🧹 Force Cleanup Complete')
            .setDescription(`Attempted to force delete ${result.attempted} stuck files.`)
            .setColor('#00ff00')
            .addFields(
                { name: 'Files Attempted', value: result.attempted.toString(), inline: true },
                { name: 'Files Deleted', value: result.deleted.toString(), inline: true },
                { name: 'Success Rate', value: `${Math.round((result.deleted / result.attempted) * 100)}%`, inline: true }
            );

        return interaction.editReply({ embeds: [embed] });

    } catch (error) {
        throw new Error(`Failed to force cleanup: ${error.message}`);
    }
}