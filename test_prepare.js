const fs = require('fs');

// We will test if our changes broke anything basic
const scriptContent = fs.readFileSync('script.js', 'utf-8');

// Quick test to see if we can parse the script
try {
  global.localStorage = { getItem: () => null, setItem: () => {} };
  global.document = {
    getElementById: () => ({ classList: { add: () => {}, remove: () => {} }, style: {}, innerHTML: '', addEventListener: () => {} }),
    querySelectorAll: () => [],
    querySelector: () => ({ classList: { add: () => {}, remove: () => {} }, style: {}, setAttribute: () => {} }),
    createElement: () => ({ classList: { add: () => {} }, style: {} }),
    documentElement: { setAttribute: () => {}, getAttribute: () => {} },
    addEventListener: () => {}
  };
  global.window = { location: { search: '' }, addEventListener: () => {}, matchMedia: () => ({ matches: false }), history: { pushState: () => {}, replaceState: () => {} }, scrollY: 0, scrollTo: () => {} };
  global.navigator = { platform: 'test', userAgent: 'test' };
  eval(scriptContent + '\n\nconsole.log("Script evaluated successfully with mocks.");');
} catch (e) {
  if (e.message.includes('firebase is not defined') || e.message.includes('document is not defined')) {
     console.log("Expected error in node env:", e.message);
  } else {
     console.error("Unexpected error:", e);
     process.exit(1);
  }
}
