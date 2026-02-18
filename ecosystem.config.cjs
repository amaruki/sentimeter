module.exports = {
  apps: [{
    name: "sentimeter",
    script: "./dist/index.js",
    interpreter: "bun", // Use Bun as the interpreter
    env: {
      NODE_ENV: "production",
    },
  }]
}
