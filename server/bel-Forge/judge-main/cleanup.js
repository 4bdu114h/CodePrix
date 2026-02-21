const fs = require("fs");
const path = require("path");

const SANDBOX_DIR = path.join(__dirname, "sandbox");
const MAX_AGE = 60 * 1000; // 1 minute in milliseconds

function cleanupOldFiles() {
    const now = Date.now();

    if (!fs.existsSync(SANDBOX_DIR)) return;

    fs.readdir(SANDBOX_DIR, (err, files) => {
        if (err) {
            console.error("Error reading sandbox directory:", err);
            return;
        }

        files.forEach((file) => {
            const filePath = path.join(SANDBOX_DIR, file);
            fs.stat(filePath, (err, stats) => {
                if (err) {
                    console.error("Error getting file stats:", err);
                    return;
                }

                if (now - stats.mtimeMs > MAX_AGE) {
                    fs.rm(filePath, { recursive: true, force: true }, (err) => {
                        if (err) {
                            console.error(`Failed to delete ${filePath}:`, err);
                        } else {
                            console.log(`🗑️ Deleted old file: ${filePath}`);
                        }
                    });
                }
            });
        });
    });
}

// Run cleanup every 30 seconds
setInterval(cleanupOldFiles, 30 * 1000);

// Run once on startup
cleanupOldFiles();
