const fs = require('fs');
let code = fs.readFileSync('script.js', 'utf8');

// Mock DOM
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const dom = new JSDOM(`<!DOCTYPE html><body><div id="pdfGrid"></div></body>`);
global.document = dom.window.document;
global.window = dom.window;
global.localStorage = {
    getItem: () => null,
    setItem: () => {}
};

console.log('Setup ready');
