const YtDlpManager = require("./YtDlpManager");

class BackgroundDownloader {
  constructor() {
    this.ytdlp = new YtDlpManager();
    this.activeDownloads = new Map(); // guildId -> download promise
  }

  // Start background downloading for a queue
  async startDownloading(queue) {
    // Don't start if already downloading for this guild
    if (this.activeDownloads.has(queue.guildId)) {
      return;
    }

    console.log(`Starting background downloads for guild ${queue.guildId}`);
    this.activeDownloads.set(queue.guildId, this.downloadLoop(queue));
  }

  // Stop background downloading for a queue
  stopDownloading(guildId) {
    if (this.activeDownloads.has(guildId)) {
      console.log(`Stopping background downloads for guild ${guildId}`);
      this.activeDownloads.delete(guildId);
    }
  }

  // Main download loop
  async downloadLoop(queue) {
    try {
      while (queue.songs.length > 0) {
        const nextSong = queue.getNextSongToDownload();

        if (!nextSong) {
          // No more songs to download, wait a bit and check again
          await this.sleep(2000);
          continue;
        }

        // Skip if currently playing song (it will be downloaded with progress)
        if (queue.songs.indexOf(nextSong) === 0 && queue.playing) {
          await this.sleep(5000);
          continue;
        }

        console.log(`Pre-downloading: ${nextSong.title}`);
        queue.markSongDownloading(nextSong);

        try {
          // Send download status to text channel
          if (queue.textChannel) {
            const embed = {
              title: "📥 Pre-downloading",
              description: `**${nextSong.title}**`,
              color: 0x3498db,
              fields: [
                {
                  name: "Position in Queue",
                  value: `#${queue.songs.indexOf(nextSong) + 1}`,
                  inline: true,
                },
                {
                  name: "Requested by",
                  value: nextSong.requestedBy.username,
                  inline: true,
                },
              ],
              footer: { text: "Background download in progress..." },
            };

            const message = await queue.textChannel.send({ embeds: [embed] });

            // Delete the message after 10 seconds
            setTimeout(() => {
              message.delete().catch(() => {});
            }, 10000);
          }

          const downloadResult = await this.ytdlp.preDownloadAudio(
            nextSong.url
          );
          queue.markSongDownloaded(nextSong, downloadResult.filepath);

          console.log(`Pre-download completed: ${nextSong.title}`);

          // Send completion status to text channel
          if (queue.textChannel) {
            const embed = {
              title: "✅ Pre-download Complete",
              description: `**${nextSong.title}**`,
              color: 0x00ff00,
              fields: [
                {
                  name: "Status",
                  value: downloadResult.cached
                    ? "💾 Was cached"
                    : "📥 Downloaded",
                  inline: true,
                },
                {
                  name: "Ready to play",
                  value: "Instantly when reached in queue",
                  inline: true,
                },
              ],
              footer: { text: "Ready for instant playback!" },
            };

            const message = await queue.textChannel.send({ embeds: [embed] });

            // Delete the message after 5 seconds
            setTimeout(() => {
              message.delete().catch(() => {});
            }, 5000);
          }
        } catch (error) {
          console.error(
            `Pre-download failed for ${nextSong.title}:`,
            error.message
          );
          nextSong.downloading = false;

          // Send error status to text channel
          if (queue.textChannel) {
            const embed = {
              title: "❌ Pre-download Failed",
              description: `**${nextSong.title}**`,
              color: 0xff0000,
              fields: [
                {
                  name: "Error",
                  value: error.message.substring(0, 100),
                  inline: false,
                },
                {
                  name: "Will try again",
                  value: "When song is about to play",
                  inline: true,
                },
              ],
            };

            const message = await queue.textChannel.send({ embeds: [embed] });

            // Delete the message after 8 seconds
            setTimeout(() => {
              message.delete().catch(() => {});
            }, 8000);
          }
        }

        // Wait a bit before next download to avoid overwhelming
        await this.sleep(3000);
      }
    } catch (error) {
      console.error("Background download loop error:", error);
    } finally {
      this.activeDownloads.delete(queue.guildId);
    }
  }

  // Helper function to sleep
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Check if downloading is active for a guild
  isDownloading(guildId) {
    return this.activeDownloads.has(guildId);
  }

  // Get download status for a guild
  getDownloadStatus(guildId) {
    return {
      active: this.activeDownloads.has(guildId),
      count: this.activeDownloads.size,
    };
  }
}

// Create a singleton instance
const backgroundDownloader = new BackgroundDownloader();

module.exports = backgroundDownloader;
