const fs = require("fs");
const path = require("path");

const SANDBOX_DIR = path.join(__dirname, "sandbox");
const MAX_AGE = 60 * 1000;

function cleanupOldFiles() {
  const now = Date.now();
  if (!fs.existsSync(SANDBOX_DIR)) return;

  fs.readdir(SANDBOX_DIR, (err, files) => {
    if (err) return;

    files.forEach((file) => {
      const filePath = path.join(SANDBOX_DIR, file);
      fs.stat(filePath, (statErr, stats) => {
        if (statErr) return;

        if (now - stats.mtimeMs > MAX_AGE) {
          fs.rm(filePath, { recursive: true, force: true }, () => {});
        }
      });
    });
  });
}

setInterval(cleanupOldFiles, 30 * 1000);
cleanupOldFiles();
