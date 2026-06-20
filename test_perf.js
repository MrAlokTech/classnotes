const fs = require('fs');

// We'll read script.js and see what we're replacing.
const code = fs.readFileSync('script.js', 'utf8');

const regex = /const matchesSemester = pdf.semester === currentSemester;[\s\S]*?return matchesSemester && matchesClass && matchesCategory && matchesSearch;/g;
const match = regex.exec(code);
if (match) {
    console.log("Found filter logic:");
    console.log(match[0]);
}

const cardRegex = /const uploadDateStr = pdf.uploadDate \|\| Date.now\(\);[\s\S]*?day: 'numeric'\n    \}\);/g;
const cardMatch = cardRegex.exec(code);
if (cardMatch) {
    console.log("\nFound card date logic:");
    console.log(cardMatch[0]);
}

const dbRegex = /if \(shouldUseCache\) \{[\s\S]*?hidePreloader\(\);\n            return;\n        \}/g;
const dbMatch = dbRegex.exec(code);
if (dbMatch) {
    console.log("\nFound db cache logic:");
    console.log(dbMatch[0]);
}

const fetchRegex = /localStorage.setItem\(CACHE_KEY, JSON.stringify\(\{[\s\S]*?hidePreloader\(\);/g;
const fetchMatch = fetchRegex.exec(code);
if (fetchMatch) {
    console.log("\nFound db fetch logic:");
    console.log(fetchMatch[0]);
}
