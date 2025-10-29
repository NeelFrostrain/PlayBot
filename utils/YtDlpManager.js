const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

class YtDlpManager {
    constructor() {
        this.downloadDir = path.join(__dirname, '..', 'downloads');
        this.ensureDownloadDir();
    }

    async ensureDownloadDir() {
        await fs.ensureDir(this.downloadDir);
    }

    // Check if yt-dlp is available
    async checkYtDlp() {
        return new Promise((resolve) => {
            const process = spawn('yt-dlp', ['--version'], { 
                shell: false,
                stdio: 'pipe'
            });
            process.on('close', (code) => {
                resolve(code === 0);
            });
            process.on('error', () => {
                resolve(false);
            });
        });
    }

    // Get video info using yt-dlp
    async getVideoInfo(url) {
        return new Promise((resolve, reject) => {
            const args = [
                '--dump-json',
                '--no-playlist',
                url
            ];

            const process = spawn('yt-dlp', args, { 
                shell: false,
                stdio: 'pipe'
            });
            let output = '';
            let error = '';

            process.stdout.on('data', (data) => {
                output += data.toString();
            });

            process.stderr.on('data', (data) => {
                error += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    try {
                        const info = JSON.parse(output);
                        resolve({
                            title: info.title,
                            duration: info.duration,
                            uploader: info.uploader,
                            thumbnail: info.thumbnail,
                            url: info.webpage_url,
                            id: info.id,
                            filesize: info.filesize_approx
                        });
                    } catch (parseError) {
                        reject(new Error('Failed to parse video info'));
                    }
                } else {
                    reject(new Error(error || 'Failed to get video info'));
                }
            });
        });
    }

    // Download audio with progress tracking
    async downloadAudio(url, progressCallback) {
        const videoInfo = await this.getVideoInfo(url);
        const filename = `${videoInfo.id}.mp3`;
        const filepath = path.join(this.downloadDir, filename);

        // Check if file already exists
        if (await fs.pathExists(filepath)) {
            return { filepath, videoInfo, cached: true };
        }

        return new Promise((resolve, reject) => {
            const args = [
                '--extract-audio',
                '--audio-format', 'mp3',
                '--audio-quality', '128K',
                '--output', path.join(this.downloadDir, '%(id)s.%(ext)s'),
                '--no-playlist',
                url
            ];

            const process = spawn('yt-dlp', args, { 
                shell: false,
                stdio: 'pipe'
            });
            let error = '';

            process.stderr.on('data', (data) => {
                const output = data.toString();
                error += output;

                // Parse progress from yt-dlp output
                const progressMatch = output.match(/\[download\]\s+(\d+\.?\d*)%/);
                if (progressMatch && progressCallback) {
                    const progress = parseFloat(progressMatch[1]);
                    progressCallback(progress, videoInfo);
                }
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve({ filepath, videoInfo, cached: false });
                } else {
                    reject(new Error(error || 'Download failed'));
                }
            });
        });
    }

    // Search for videos
    async searchVideos(query, limit = 5) {
        return new Promise((resolve, reject) => {
            const args = [
                '--dump-json',
                '--flat-playlist',
                '--playlist-end', limit.toString(),
                `ytsearch${limit}:${query}`
            ];

            const process = spawn('yt-dlp', args, { 
                shell: false,
                stdio: 'pipe'
            });
            let output = '';
            let error = '';

            process.stdout.on('data', (data) => {
                output += data.toString();
            });

            process.stderr.on('data', (data) => {
                error += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    try {
                        const lines = output.trim().split('\n').filter(line => line.trim());
                        const results = lines.map(line => {
                            const info = JSON.parse(line);
                            return {
                                title: info.title,
                                url: `https://www.youtube.com/watch?v=${info.id}`,
                                id: info.id,
                                duration: info.duration,
                                uploader: info.uploader || 'Unknown'
                            };
                        });
                        resolve(results);
                    } catch (parseError) {
                        console.error('Parse error:', parseError);
                        console.error('Output:', output);
                        reject(new Error('Failed to parse search results'));
                    }
                } else {
                    reject(new Error(error || 'Search failed'));
                }
            });
        });
    }

    // Get playlist info
    async getPlaylistInfo(url) {
        return new Promise((resolve, reject) => {
            const args = [
                '--dump-json',
                '--flat-playlist',
                url
            ];

            const process = spawn('yt-dlp', args, { 
                shell: false,
                stdio: 'pipe'
            });
            let output = '';
            let error = '';

            process.stdout.on('data', (data) => {
                output += data.toString();
            });

            process.stderr.on('data', (data) => {
                error += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    try {
                        const lines = output.trim().split('\n');
                        const videos = lines.map(line => {
                            const info = JSON.parse(line);
                            return {
                                title: info.title,
                                url: info.url,
                                id: info.id,
                                duration: info.duration
                            };
                        });
                        resolve(videos);
                    } catch (parseError) {
                        reject(new Error('Failed to parse playlist'));
                    }
                } else {
                    reject(new Error(error || 'Failed to get playlist'));
                }
            });
        });
    }

    // Download audio without progress callback (for pre-downloading)
    async preDownloadAudio(url) {
        const videoInfo = await this.getVideoInfo(url);
        const filename = `${videoInfo.id}.mp3`;
        const filepath = path.join(this.downloadDir, filename);

        // Check if file already exists
        if (await fs.pathExists(filepath)) {
            return { filepath, videoInfo, cached: true };
        }

        return new Promise((resolve, reject) => {
            const args = [
                '--extract-audio',
                '--audio-format', 'mp3',
                '--audio-quality', '128K',
                '--output', path.join(this.downloadDir, '%(id)s.%(ext)s'),
                '--no-playlist',
                url
            ];

            const process = spawn('yt-dlp', args, { 
                shell: false,
                stdio: 'pipe'
            });
            let error = '';

            process.stderr.on('data', (data) => {
                error += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve({ filepath, videoInfo, cached: false });
                } else {
                    reject(new Error(error || 'Pre-download failed'));
                }
            });
        });
    }

    // Delete a specific file with retry logic
    async deleteFile(filepath, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                if (await fs.pathExists(filepath)) {
                    await fs.remove(filepath);
                    console.log(`Deleted audio file: ${filepath}`);
                    return true;
                }
                return false;
            } catch (error) {
                if (error.code === 'EBUSY' && i < retries - 1) {
                    console.log(`File busy, retrying in ${(i + 1) * 2} seconds...`);
                    await new Promise(resolve => setTimeout(resolve, (i + 1) * 2000));
                    continue;
                }
                console.error('Error deleting file:', error);
                return false;
            }
        }
        return false;
    }

    // Clean up old downloads
    async cleanupOldFiles(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
        try {
            const files = await fs.readdir(this.downloadDir);
            const now = Date.now();

            for (const file of files) {
                const filepath = path.join(this.downloadDir, file);
                const stats = await fs.stat(filepath);
                
                if (now - stats.mtime.getTime() > maxAge) {
                    await fs.remove(filepath);
                    console.log(`Cleaned up old file: ${file}`);
                }
            }
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    }

    // Get file size in MB
    getFileSizeMB(bytes) {
        return (bytes / (1024 * 1024)).toFixed(2);
    }

    // Format duration
    formatDuration(seconds) {
        if (!seconds) return '0:00';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    // Create progress embed
    createProgressEmbed(progress, videoInfo, additionalInfo = {}) {
        const progressBar = this.createProgressBar(progress);
        const progressPercent = progress.toFixed(1);
        
        const embed = new EmbedBuilder()
            .setTitle('📥 Downloading Audio')
            .setDescription(`**${videoInfo.title}**`)
            .setColor(progress < 50 ? '#ff9900' : progress < 90 ? '#ffcc00' : '#00ff00')
            .addFields(
                { name: 'Download Progress', value: `${progressBar} ${progressPercent}%`, inline: false },
                { name: 'Duration', value: this.formatDuration(videoInfo.duration), inline: true },
                { name: 'Uploader', value: videoInfo.uploader || 'Unknown', inline: true }
            );

        // Add file size if available
        if (videoInfo.filesize) {
            embed.addFields({
                name: 'File Size',
                value: `~${this.getFileSizeMB(videoInfo.filesize)} MB`,
                inline: true
            });
        }

        // Add status message based on progress
        let statusMessage = '';
        if (progress < 10) {
            statusMessage = '🔍 Analyzing video...';
        } else if (progress < 50) {
            statusMessage = '⬇️ Downloading audio...';
        } else if (progress < 90) {
            statusMessage = '🔄 Processing audio...';
        } else {
            statusMessage = '✅ Almost ready!';
        }

        embed.addFields({
            name: 'Status',
            value: statusMessage,
            inline: false
        });

        if (videoInfo.thumbnail) {
            embed.setThumbnail(videoInfo.thumbnail);
        }

        embed.setTimestamp();
        embed.setFooter({ text: 'Powered by yt-dlp' });

        return embed;
    }

    // Create progress bar
    createProgressBar(progress, length = 20) {
        const filled = Math.round((progress / 100) * length);
        const empty = length - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    }
}

module.exports = YtDlpManager;