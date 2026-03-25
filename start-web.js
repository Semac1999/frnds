const { execSync } = require('child_process');
process.chdir(__dirname);
execSync('npx expo start --web --port 8081 --clear', { stdio: 'inherit', shell: true });
