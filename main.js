const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const path = require("path");

// 1. Helper function for randomized delays (Crucial for anti-ban)
const randomDelay = (min, max) => {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// 2. Initialize the Client with LocalAuth to save the session
const client = new Client({
  // Adding a clientId forces it to isolate the session data properly
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true, // No GUI seen
    args: ["--no-sandbox", "--disable-setuid-sandbox"], // Added extra flag for stability
  },
});

// 3. Generate QR Code in Terminal
client.on("qr", (qr) => {
  console.log("Scan this QR code with your WhatsApp app:");
  qrcode.generate(qr, { small: true });
});
client.on("authenticated", () => {
  console.log("🔒 Authentication successful! Session is saving...");
});

// 4. When successfully authenticated
client.on("ready", async () => {
  console.log("✅ Client is ready! Starting the blast...");
  await startBlasting();
});

// 5. The Core Blasting Logic
async function startBlasting() {
  try {
    // Load your targets
    const rawData = fs.readFileSync(
      path.join(__dirname, "data", "targets.json"),
    );
    const targets = JSON.parse(rawData);

    // Load the image you want to send
    // const mediaPath = path.join(__dirname, 'assets', 'promo.jpg');
    // const media = MessageMedia.fromFilePath(mediaPath);

    console.log(`Found ${targets.length} targets. Processing...`);

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];

      // whatsapp-web.js REQUIRES the @c.us suffix for standard chats
      let formattedNumber = target.phone + "@c.us";

      console.log(
        `[${i + 1}/${targets.length}] Sending to ${target.name} (${formattedNumber})...`,
      );
      // 1. Check if the number is actually registered on WhatsApp first!
      const isRegistered = await client.isRegisteredUser(formattedNumber);
      if (!isRegistered) {
        console.log(
          `❌ Number ${formattedNumber} is not registered on WhatsApp.`,
        );
        return; // Skip this number
      }

      try {
        await client.sendMessage(
          formattedNumber,
          "Testing message from Node.js!",
        );
        console.log(`✅ Message passed to browser for ${formattedNumber}`);
      } catch (err) {
        console.error(`❌ Failed to send:`, err);
      }

      try {
        // Send Image First (Optional: you can add a caption here too)
        // await client.sendMessage(formattedNumber, media, { caption: `Halo Kak ${target.name}, permisi...` });

        // Add a small delay between sending the image and the follow-up text
        // await randomDelay(3000, 10000);

        // Send Follow-up Text
        const textMessage = `Saya lihat postingan Kakak di grup FB. Apakah barangnya masih ada?`;
        await client.sendMessage(formattedNumber, textMessage);

        console.log(`✅ Sent successfully to ${target.name}`);
      } catch (err) {
        console.error(`❌ Failed to send to ${target.name}:`, err.message);
      }

      // HUGE DELAY BETWEEN CONTACTS (e.g., 3 to 7 minutes)
      if (i < targets.length - 1) {
        const waitTime =
          Math.floor(Math.random() * (420000 - 180000 + 1)) + 180000;
        console.log(
          `Waiting ${waitTime / 1000} seconds before next message...\n`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    // 2. THE CRUCIAL EXIT DELAY
    console.log("Waiting 10 seconds for the browser to finish syncing to WhatsApp servers...");
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    console.log("🎉 Blasting complete!");
    console.log("Safe to exit.");
    process.exit(0);
  } catch (error) {
    console.error("Fatal error during blasting:", error);
  }
}

// 6. Start the bot
client.initialize();
