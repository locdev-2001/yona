// ponytail: pm2 ecosystem — log paths relative to bridge root (storage/logs/zalo-bridge under project root via symlink or adjust)
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, ".env") });

module.exports = {
    apps: [
        {
            name: "zalo-personal-bridge",
            cwd: __dirname,
            script: "src/index.mjs",
            interpreter: "node",
            instances: 1,
            exec_mode: "fork",
            env: {
                NODE_ENV: "production",
                ...process.env
            },
            autorestart: true,
            watch: false,
            max_memory_restart: "512M",
            // Log paths → storage/logs/zalo-bridge (relative từ project root, bridge chạy từ modules/channel-zalo/services/bridge)
            error_file: path.join(__dirname, "../../../../storage/logs/zalo-bridge/error.log"),
            out_file: path.join(__dirname, "../../../../storage/logs/zalo-bridge/out.log"),
            log_date_format: "YYYY-MM-DD HH:mm:ss",
            merge_logs: true,
            kill_timeout: 5000,
            listen_timeout: 5000,
            restart_delay: 3000,
            max_restarts: 15,
            min_uptime: "5s"
        }
    ]
};
