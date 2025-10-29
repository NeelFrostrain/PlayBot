# yt-dlp Setup Guide

This guide will help you install yt-dlp for the Discord music bot.

## What is yt-dlp?

yt-dlp is a powerful command-line tool for downloading videos and audio from YouTube and many other sites. It's more reliable than streaming methods and provides better quality control.

## Installation

### Windows

#### Method 1: Direct Download (Recommended)
1. Go to https://github.com/yt-dlp/yt-dlp/releases
2. Download `yt-dlp.exe` from the latest release
3. Place it in a folder that's in your PATH, or:
4. Create a folder like `C:\yt-dlp\` and put `yt-dlp.exe` there
5. Add `C:\yt-dlp\` to your system PATH:
   - Press Win + R, type `sysdm.cpl`, press Enter
   - Go to "Advanced" tab → "Environment Variables"
   - Under "System Variables", find "Path" and click "Edit"
   - Click "New" and add `C:\yt-dlp\`
   - Click OK on all dialogs
6. Restart your command prompt/terminal

#### Method 2: Using Package Managers
```bash
# Using Chocolatey
choco install yt-dlp

# Using Scoop
scoop install yt-dlp

# Using winget
winget install yt-dlp
```

### Linux

#### Ubuntu/Debian
```bash
# Method 1: Using apt (if available)
sudo apt update
sudo apt install yt-dlp

# Method 2: Using pip
pip install yt-dlp

# Method 3: Direct download
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

#### CentOS/RHEL/Fedora
```bash
# Using pip
pip install yt-dlp

# Or download directly
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

### macOS

```bash
# Using Homebrew
brew install yt-dlp

# Using pip
pip install yt-dlp

# Direct download
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
chmod a+rx /usr/local/bin/yt-dlp
```

## Verification

After installation, verify yt-dlp is working:

```bash
yt-dlp --version
```

You should see a version number like `2023.XX.XX`.

## Bot Commands

Once yt-dlp is installed, you can use these bot commands:

- `/play-ytdlp <query>` - Play music using yt-dlp (with download progress)
- `/playlist-ytdlp <url>` - Play entire playlists using yt-dlp
- `/cleanup info` - Show downloaded files information
- `/cleanup old [hours]` - Clean up old downloaded files
- `/cleanup all` - Delete all downloaded files

## Features

### Advantages of yt-dlp method:
- ✅ More reliable than streaming
- ✅ Better audio quality control
- ✅ Works with age-restricted videos (in some cases)
- ✅ Caches downloaded files for faster replay
- ✅ Progress bars during download
- ✅ Detailed error messages
- ✅ Supports many video sites beyond YouTube

### Download Management:
- Files are saved as MP3 format (128K quality for smaller size)
- Cached files are reused for faster playback
- Automatic cleanup of old files
- Manual cleanup commands available

## Troubleshooting

### "yt-dlp is not installed or not available in PATH"
- Make sure yt-dlp is installed correctly
- Verify it's in your system PATH
- Try running `yt-dlp --version` in terminal
- Restart your bot after installation

### Download Errors
- Some videos may be geo-blocked or private
- Age-restricted videos might not work
- Try the regular `/play` command as fallback

### Storage Management
- Use `/cleanup old` regularly to free space
- Monitor disk usage with `/cleanup info`
- Downloaded files are stored in `downloads/` folder

### Performance Tips
- Downloaded files are cached for faster replay
- Use `/cleanup old 6` to keep recent files but free space
- Consider SSD storage for better performance

## File Structure

```
discord-music-bot/
├── downloads/           # Downloaded audio files
│   ├── VIDEO_ID1.mp3
│   ├── VIDEO_ID2.mp3
│   └── ...
├── commands/
│   ├── play-ytdlp.js   # Main yt-dlp play command
│   ├── playlist-ytdlp.js # Playlist support
│   └── cleanup.js      # File management
└── utils/
    └── YtDlpManager.js # yt-dlp integration
```

## Security Notes

- yt-dlp is safe and widely used
- Downloaded files are stored locally
- No external services required
- Regular cleanup prevents disk space issues

## Updates

Keep yt-dlp updated for best compatibility:

```bash
# Update yt-dlp
pip install --upgrade yt-dlp

# Or download latest version manually
```

## Support

If you encounter issues:
1. Check yt-dlp installation with `yt-dlp --version`
2. Use `/debug <url>` command to test specific videos
3. Check bot console logs for detailed errors
4. Try fallback commands like `/play-alt` if needed