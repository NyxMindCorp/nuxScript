const fs = require('fs');
const path = require('path');

function watchFile(filePath, options = {}) {
  const resolved = path.resolve(filePath);

  if (!fs.existsSync(resolved)) {
    console.error(`File not found: ${resolved}`);
    process.exit(1);
  }

  const { runFile } = require('../../bin/nux');

  console.log(`Watching ${resolved} for changes...`);

  let timeout = null;

  const watcher = fs.watch(resolved, (eventType) => {
    if (eventType !== 'change') return;

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      console.clear();
      console.log(`[${new Date().toLocaleTimeString()}] File changed, re-running...`);
      try {
        const result = runFile(resolved, options);
        if (result !== undefined) {
          console.log('=>', result);
        }
        console.log('Watching for changes...');
      } catch (err) {
        console.error('Error:', err.message);
        console.log('Watching for changes...');
      }
    }, 100);
  });

  try {
    console.log('Initial run:');
    const result = runFile(resolved, options);
    if (result !== undefined) {
      console.log('=>', result);
    }
  } catch (err) {
    console.error('Initial run error:', err.message);
  }

  process.on('SIGINT', () => {
    console.log('\nStopped watching');
    watcher.close();
    process.exit(0);
  });

  return watcher;
}

module.exports = { watchFile };
