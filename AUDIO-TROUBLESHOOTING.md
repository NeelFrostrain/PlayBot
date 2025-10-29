# Audio Troubleshooting Guide

## Common Audio Issues and Solutions

### Issue: "Cannot find module '@discordjs/opus'"

**Symptoms:**
- Bot fails to play audio
- Error mentions missing opus modules
- Audio commands fail with codec errors

**Solution:**
```bash
npm install @discordjs/opus
```

**Alternative Solutions:**
If the above doesn't work, try these alternatives:

```bash
# Option 1: Install opusscript (JavaScript implementation)
npm install opusscript

# Option 2: Install node-opus (native implementation)
npm install node-opus

# Option 3: Reinstall voice dependencies
npm uninstall @discordjs/voice
npm install @discordjs/voice @discordjs/opus
```

### Issue: "Error message too long for embed"

**Symptoms:**
- Bot crashes with "Invalid string length" error
- Embed field exceeds 1024 characters
- CombinedPropertyError in console

**Solution:**
This is automatically handled in the latest version by truncating long error messages.

### Issue: Audio quality problems

**Symptoms:**
- Distorted audio
- Volume too low/high
- Audio cutting out

**Solutions:**
1. **Check volume settings:**
   ```
   /volume 50
   ```

2. **Verify audio format:**
   - Bot uses MP3 128K quality
   - Files are automatically converted

3. **Check voice channel permissions:**
   - Bot needs "Connect" and "Speak" permissions
   - Check voice channel bitrate settings

### Issue: "FFMPEG not found"

**Symptoms:**
- Audio processing fails
- Cannot convert audio formats

**Solution:**
FFMPEG is included automatically via `ffmpeg-static` package. If issues persist:

```bash
npm install ffmpeg-static --force
```

### Issue: Voice connection problems

**Symptoms:**
- Bot joins voice channel but no audio
- Connection drops frequently
- "Voice connection failed" errors

**Solutions:**
1. **Check network stability**
2. **Verify voice region compatibility**
3. **Restart bot and try again**
4. **Check Discord API status**

### Testing Audio Setup

Run this command to test your audio setup:
```bash
node check-setup.js
```

This will verify:
- ✅ All audio dependencies installed
- ✅ Opus codec available
- ✅ FFMPEG working
- ✅ Voice library functional

### Performance Tips

1. **Use lower bitrate for better stability:**
   - Bot automatically uses 128K MP3
   - Reduces bandwidth usage

2. **Monitor memory usage:**
   - Large queues can use more memory
   - Use `/cleanup old` regularly

3. **Check voice channel limits:**
   - Some channels have user limits
   - Bot counts as a user

### Getting Help

If audio issues persist:

1. **Check console logs** for specific error messages
2. **Use `/debug <url>`** to test specific videos
3. **Verify bot permissions** in voice channels
4. **Test with different audio sources**
5. **Restart the bot** to clear any stuck connections

### Dependencies Overview

Required for audio functionality:
- `@discordjs/voice` - Voice connection handling
- `@discordjs/opus` - Audio encoding/decoding
- `ffmpeg-static` - Audio processing
- `libsodium-wrappers` - Encryption for voice data

Optional alternatives:
- `opusscript` - Pure JavaScript Opus implementation
- `node-opus` - Native Opus bindings (faster but requires compilation)