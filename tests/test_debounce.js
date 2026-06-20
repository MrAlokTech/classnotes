const fs = require('fs');

const scriptContent = fs.readFileSync('script.js', 'utf8');
try {
  eval(scriptContent);
  console.log("Syntax is valid!");
} catch (e) {
  if (e instanceof ReferenceError || e instanceof TypeError) {
    // Expected because DOM isn't present
    console.log("Syntax is valid! (Caught expected error)", e.message);
  } else {
    console.error(e);
    process.exit(1);
  }
}
