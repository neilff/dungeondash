require('dotenv').config();
const execSync = require('child_process').execSync;

console.info('Uploading to surge.sh server: ', process.env.SURGE_URL);

// Executes the surge upload command
execSync(`surge --domain ${process.env.SURGE_URL} dist`, {
  stdio: [0, 1, 2],
});
