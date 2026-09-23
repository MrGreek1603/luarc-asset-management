module.exports = {
  apps: [
    {
      name: "luarc-asset-management",
      script: "dist/server.js",
      instances: "max",
      exec_mode: "cluster",

      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },

      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
    },
  ],
};