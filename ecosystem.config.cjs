// pm2 process definition for running the built server as a persistent background
// process (and, via pm2-windows-startup, auto-starting it on Windows boot).
// Usage: npm run build, then `pm2 start ecosystem.config.cjs`.
module.exports = {
  apps: [
    {
      name: "ashapura-quotation",
      cwd: "./server",
      script: "dist/index.js",
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
    },
  ],
};
