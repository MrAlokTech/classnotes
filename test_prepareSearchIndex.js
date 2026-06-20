const fs = require('fs');

const scriptContent = fs.readFileSync('script.js', 'utf8');

const hasPrepareSearchIndex = scriptContent.includes('prepareSearchIndex');
console.log('hasPrepareSearchIndex:', hasPrepareSearchIndex);

const hasSearchStr = scriptContent.includes('_searchStr');
console.log('hasSearchStr:', hasSearchStr);
