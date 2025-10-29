# Discord Music Bot

A Discord music bot built with Discord.js v14 that supports playing music from YouTube with playlist support.

## Features

- 🎵 Play music from YouTube (URLs or search queries)
- 📋 Playlist support
- ⏭️ Skip songs
- ⏹️ Stop music and clear queue
- 📜 View current queue
- 🎶 Now playing information
- 🌐 Global slash commands

## Setup

1. **Install yt-dlp** (Required):
   - **Windows**: Download from https://github.com/yt-dlp/yt-dlp/releases
   - **Linux**: `sudo apt install yt-dlp` or `pip install yt-dlp`
   - **macOS**: `brew install yt-dlp`

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create a `.env` file:**
   ```
   DISCORD_TOKEN=your_bot_token_here
   CLIENT_ID=your_client_id_here
   ```

4. **Verify setup:**
   ```bash
   npm run setup
   ```

5. **Deploy commands:**
   ```bash
   npm run deploy
   ```

6. **Start the bot:**
   ```bash
   npm start
   ```

## Commands

### Basic Commands
- `/play <query>` - Play a song from YouTube (URL or search) with yt-dlp
- `/playlist <url>` - Play a YouTube playlist using yt-dlp
- `/queue` - Show the current music queue with pagination
- `/skip` - Skip the current song
- `/stop` - Stop music and clear queue
- `/nowplaying` - Show currently playing song with thumbnail
- `/247 <on/off/status>` - Toggle 24/7 mode (keeps bot in voice channel)

### Advanced Queue Management
- `/shuffle` - Shuffle the current queue
- `/loop <mode>` - Set loop mode (off/song/queue)
- `/remove <position>` - Remove a specific song from queue
- `/clear` - Clear the entire queue
- `/move <from> <to>` - Move a song to different position
- `/pause` - Pause or resume playbook
- `/history` - Show recently played songs
- `/controls` - Interactive music control panel

### File Management Commands
- `/cleanup info` - Show downloaded files information
- `/cleanup old [hours]` - Clean up files older than specified hours
- `/cleanup all` - Delete all downloaded files
- `/downloads` - Show background download status

### Troubleshooting Commands
- `/debug <url>` - Debug information for administrators

## Troubleshooting

### YouTube 403 Forbidden Errors
If you get "HTTP Error 403: Forbidden" when trying to play songs:

1. **Update yt-dlp to the latest version:**
   ```bash
   npm run update-ytdlp
   # or manually:
   pip install --upgrade yt-dlp
   ```

2. **Try different videos** - Some videos may be region-blocked or have restrictions

3. **Check yt-dlp directly:**
   ```bash
   yt-dlp --version
   yt-dlp "https://www.youtube.com/watch?v=VIDEO_ID"
   ```

### For Termux Users
- Make sure you have the latest version of yt-dlp installed
- Some videos might not work due to mobile IP restrictions
- Try using a VPN if available

## Requirements

- Node.js 16.9.0 or higher
- Discord bot token and permissions
- FFmpeg (system installation required)
- yt-dlp (latest version recommended)
- **yt-dlp** (optional, for enhanced reliability) - See [YT-DLP-SETUP.md](YT-DLP-SETUP.md)

## Bot Permissions

Make sure your bot has the following permissions:

- Send Messages
- Use Slash Commands
- Connect to Voice Channels
- Speak in Voice Channels

## Features

### yt-dlp Integration (Default)
- ✅ **Download Progress Bars** - See real-time download progress
- ✅ **Background Pre-downloading** - Next songs download automatically
- ✅ **Instant Playback** - Pre-downloaded songs play immediately
- ✅ **Auto File Cleanup** - Files deleted after playing to save space
- ✅ **Better Reliability** - Works with more videos and edge cases
- ✅ **Quality Control** - Consistent MP3 128K audio quality
- ✅ **Rich Embeds** - Beautiful progress and status displays

## Notes

- The bot uses yt-dlp exclusively for maximum reliability
- **yt-dlp is required** - see installation instructions below
- Downloaded files are **automatically deleted** after playing to save space
- Playlists are limited to 50 songs for performance
- FFmpeg must be installed on your system

## Setup yt-dlp (Required)

yt-dlp is required for the bot to function:

**Windows:** Download from https://github.com/yt-dlp/yt-dlp/releases  
**Linux:** `sudo apt install yt-dlp` or `pip install yt-dlp`  
**macOS:** `brew install yt-dlp`

See [YT-DLP-SETUP.md](YT-DLP-SETUP.md) for detailed installation instructions.

## Troubleshooting

If you encounter issues:

1. **Verify yt-dlp installation**: Run `yt-dlp --version` in terminal
2. **Debug specific URLs**: `/debug <url>`
3. **Check setup guides**: [YT-DLP-SETUP.md](YT-DLP-SETUP.md) and [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
4. **Verify permissions**: Bot needs Connect and Speak in voice channels
