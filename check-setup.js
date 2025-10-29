// Setup verification script
const { spawn } = require("child_process");
const fs = require("fs-extra");
const path = require("path");

console.log("🔧 Discord Music Bot Setup Verification\n");

async function checkSetup() {
  let allGood = true;

  // Check Node.js version
  console.log("📦 Checking Node.js version...");
  const nodeVersion = process.version;
  console.log(`✅ Node.js: ${nodeVersion}`);

  // Check dependencies
  console.log("\n📚 Checking dependencies...");
  try {
    require("discord.js");
    console.log("✅ discord.js");

    require("@discordjs/voice");
    console.log("✅ @discordjs/voice");

    require("fs-extra");
    console.log("✅ fs-extra");

    require("libsodium-wrappers");
    console.log("✅ libsodium-wrappers");
    
    require("opusscript");
    console.log("✅ opusscript");
  } catch (error) {
    console.log(`❌ Missing dependency: ${error.message}`);
    allGood = false;
  }

  // Check yt-dlp
  console.log("\n🎵 Checking yt-dlp...");
  const ytdlpAvailable = await checkYtDlp();
  if (ytdlpAvailable) {
    console.log("✅ yt-dlp is available");
  } else {
    console.log("❌ yt-dlp not found in PATH");
    console.log("📥 Install from: https://github.com/yt-dlp/yt-dlp/releases");
    allGood = false;
  }

  // Check .env file
  console.log("\n🔐 Checking configuration...");
  if (await fs.pathExists(".env")) {
    console.log("✅ .env file exists");

    require("dotenv").config();
    if (process.env.DISCORD_TOKEN) {
      console.log("✅ DISCORD_TOKEN configured");
    } else {
      console.log("❌ DISCORD_TOKEN not set in .env");
      allGood = false;
    }

    if (process.env.CLIENT_ID) {
      console.log("✅ CLIENT_ID configured");
    } else {
      console.log("❌ CLIENT_ID not set in .env");
      allGood = false;
    }
  } else {
    console.log("❌ .env file not found");
    console.log(
      "📝 Copy .env.example to .env and fill in your bot credentials"
    );
    allGood = false;
  }

  // Check downloads directory
  console.log("\n📁 Checking downloads directory...");
  const downloadDir = path.join(__dirname, "downloads");
  await fs.ensureDir(downloadDir);
  console.log("✅ Downloads directory ready");

  // Final result
  console.log("\n" + "=".repeat(50));
  if (allGood) {
    console.log("🎉 Setup verification complete! Bot is ready to run.");
    console.log("\n📋 Next steps:");
    console.log("1. Run: node deploy-commands.js");
    console.log("2. Run: npm start");
  } else {
    console.log("❌ Setup incomplete. Please fix the issues above.");
  }
  console.log("=".repeat(50));
}

function checkYtDlp() {
  return new Promise((resolve) => {
    const process = spawn("yt-dlp", ["--version"], { shell: true });
    process.on("close", (code) => {
      resolve(code === 0);
    });
    process.on("error", () => {
      resolve(false);
    });
  });
}

checkSetup().catch(console.error);
