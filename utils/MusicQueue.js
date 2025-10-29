const { createAudioPlayer } = require('@discordjs/voice');

class MusicQueue {
    constructor(guildId) {
        this.guildId = guildId;
        this.connection = null;
        this.player = null;
        this.songs = [];
        this.playing = false;
        this.paused = false;
        this.loop = 'off'; // 'off', 'song', 'queue'
        this.volume = 0.5;
        this.textChannel = null;
        this.voiceChannel = null;
        this.autoplay = false;
        this.history = [];
        this.downloading = false;
        this.downloadQueue = [];
    }

    addSong(song) {
        this.songs.push(song);
        return this.songs.length;
    }

    addSongs(songs) {
        this.songs.push(...songs);
        return this.songs.length;
    }

    removeSong(index) {
        if (index >= 0 && index < this.songs.length) {
            return this.songs.splice(index, 1)[0];
        }
        return null;
    }

    moveSong(from, to) {
        if (from >= 0 && from < this.songs.length && to >= 0 && to < this.songs.length) {
            const song = this.songs.splice(from, 1)[0];
            this.songs.splice(to, 0, song);
            return true;
        }
        return false;
    }

    shuffle() {
        if (this.songs.length <= 1) return false;
        
        // Keep current song at index 0, shuffle the rest
        const currentSong = this.songs[0];
        const restSongs = this.songs.slice(1);
        
        for (let i = restSongs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [restSongs[i], restSongs[j]] = [restSongs[j], restSongs[i]];
        }
        
        this.songs = [currentSong, ...restSongs];
        return true;
    }

    clear() {
        const clearedCount = this.songs.length;
        this.songs = [];
        return clearedCount;
    }

    getCurrentSong() {
        return this.songs[0] || null;
    }

    getUpcoming(limit = 10) {
        return this.songs.slice(1, limit + 1);
    }

    getTotalDuration() {
        return this.songs.reduce((total, song) => total + (song.duration || 0), 0);
    }

    getQueueSize() {
        return this.songs.length;
    }

    setLoop(mode) {
        const validModes = ['off', 'song', 'queue'];
        if (validModes.includes(mode)) {
            this.loop = mode;
            return true;
        }
        return false;
    }

    setVolume(volume) {
        if (volume >= 0 && volume <= 100) {
            this.volume = volume / 100; // Convert to 0-1 range
            return true;
        }
        return false;
    }

    getVolumePercent() {
        return Math.round(this.volume * 100);
    }

    // Check if a song is already downloaded
    isSongDownloaded(song) {
        return song.filepath && require('fs-extra').pathExistsSync(song.filepath);
    }

    // Get next song that needs downloading
    getNextSongToDownload() {
        return this.songs.find(song => !song.filepath && !song.downloading);
    }

    // Mark song as being downloaded
    markSongDownloading(song) {
        song.downloading = true;
    }

    // Mark song as download complete
    markSongDownloaded(song, filepath) {
        song.downloading = false;
        song.filepath = filepath;
    }

    addToHistory(song) {
        this.history.unshift(song);
        if (this.history.length > 50) {
            this.history = this.history.slice(0, 50);
        }
    }

    getHistory(limit = 10) {
        return this.history.slice(0, limit);
    }

    destroy() {
        if (this.connection) {
            this.connection.destroy();
        }
        if (this.player) {
            this.player.stop();
        }
        this.songs = [];
        this.history = [];
        this.playing = false;
        this.paused = false;
    }
}

module.exports = MusicQueue;