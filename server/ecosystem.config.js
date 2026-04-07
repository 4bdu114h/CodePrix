/**
 * PM2 Ecosystem Configuration for CodePrix Backend
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 restart codeprix-api
 *   pm2 logs codeprix-api
 *   pm2 monit
 */
module.exports = {
    apps: [
        {
            name: "codeprix-api",
            script: "server.js",
            instances: 1,              // Single instance (execution engine is CPU-bound)
            max_memory_restart: "512M", // Auto-restart if memory exceeds 512MB
            env: {
                NODE_ENV: "production",
            },
            // Log management
            log_date_format: "YYYY-MM-DD HH:mm:ss",
            error_file: "./logs/error.log",
            out_file: "./logs/out.log",
            merge_logs: true,
            // Crash recovery
            autorestart: true,
            watch: false,               // Do not watch files in production
            max_restarts: 10,
            restart_delay: 1000,
        },
    ],
};
