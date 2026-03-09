const fs = require('fs');
const script = fs.readFileSync('script.js', 'utf8');

// We just do syntax checking
try {
  new Function(script);
  console.log("Syntax OK");
} catch (e) {
  console.error("Syntax Error:", e);
}
