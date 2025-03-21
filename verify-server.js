const fs = require('fs');
const path = require('path');

// Write to a file to verify the script is running
fs.writeFileSync(path.join(__dirname, 'server-status.txt'), 'Server started at ' + new Date().toISOString());

console.log('Verification complete. Check server-status.txt file.'); 