# Troubleshooting Guide

## Common Issues and Solutions

### "An error occurred while trying to play the song!"

This error can have several causes:

#### 1. **YouTube Video Issues**

- **Age-restricted videos**: Cannot be played by bots
- **Private/Unlisted videos**: Not accessible
- **Copyright blocked**: Blocked in your region
- **Live streams**: May not work with ytdl-core

**Solution**: Try the `/play-alt` command which uses a different library.

#### 2. **Network/Connection Issues**

- **Slow internet**: Use lower quality settings
- **Firewall blocking**: Check network settings
- **YouTube rate limiting**: Wait and try again

**Solution**: The bot automatically uses lower quality audio for better compatibility.

#### 3. **Voice Channel Issues**

- **Missing permissions**: Bot needs Connect and Speak permissions
- **Voice channel full**: Bot cannot join
- **Different voice regions**: May cause connection issues

**Solution**: Check bot permissions and voice channel settings.

### Debugging Steps

1. **Use the debug command**:

   ```
   /debug url:https://youtube.com/watch?v=VIDEO_ID
   ```

2. **Try alternative play command**:

   ```
   /play-alt query:your song name
   ```

3. **Check bot permissions**:

   - Send Messages
   - Use Slash Commands
   - Connect to Voice Channels
   - Speak in Voice Channels

4. **Check console logs**:
   - Look for error messages in the bot console
   - Check for network errors or API issues

### Alternative Solutions

If the main `/play` command doesn't work:

1. **Use `/play-alt`** - Uses play-dl library instead of ytdl-core
2. **Try different video URLs** - Some videos work better than others
3. **Use search instead of URLs** - Sometimes search results work better
4. **Restart the bot** - Clears any stuck connections

### Performance Tips

- Use `/clear` to clear large queues
- Restart bot if memory usage gets high
- Use `/stop` instead of just leaving voice channel
- Keep queue size reasonable (under 100 songs)

### Getting Help

If issues persist:

1. Check the console logs for specific error messages
2. Use `/debug` command to get detailed information
3. Try `/play-alt` as an alternative
4. Ensure all dependencies are properly installed
5. Verify bot has correct permissions

### Common Error Messages

- **"Video unavailable"**: Video is private, deleted, or region-blocked
- **"age-restricted"**: Video requires age verification
- **"copyright"**: Video is blocked due to copyright
- **"network"**: Connection or rate limiting issue
- **"Failed to connect to voice channel"**: Permission or connection issue
