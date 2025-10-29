#!/usr/bin/env node

const { spawn } = require('child_process');

console.log('🔄 Updating yt-dlp to latest version...');

const updateProcess = spawn('pip', ['install', '--upgrade', 'yt-dlp'], {
    stdio: 'inherit',
    shell: false
});

updateProcess.on('close', (code) => {
    if (code === 0) {
        console.log('✅ yt-dlp updated successfully!');
        console.log('🎵 You can now try playing music again.');
    } else {
        console.log('❌ Failed to update yt-dlp. Try running manually:');
        console.log('   pip install --upgrade yt-dlp');
        console.log('   or');
        console.log('   pip3 install --upgrade yt-dlp');
    }
});

updateProcess.on('error', (error) => {
    console.error('❌ Error updating yt-dlp:', error.message);
    console.log('💡 Try running manually:');
    console.log('   pip install --upgrade yt-dlp');
    console.log('   or');
    console.log('   pip3 install --upgrade yt-dlp');
});