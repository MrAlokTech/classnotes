const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

// Extract the prepareSearchIndex function from script.js
const scriptContent = fs.readFileSync('script.js', 'utf8');

// A simple regex to grab the function body
const functionMatch = scriptContent.match(/function prepareSearchIndex\([\s\S]*?\n}/);

if (!functionMatch) {
    console.error("Could not find prepareSearchIndex in script.js");
    process.exit(1);
}

const context = { console };
vm.createContext(context);
vm.runInContext(functionMatch[0], context);

// Define test cases
const tests = [
    {
        name: "Basic formatting",
        input: {
            title: "Test PDF",
            description: "A description",
            category: "Physics",
            author: "John Doe",
            uploadDate: "2023-01-01T12:00:00Z"
        },
        verify: (result) => {
            assert.strictEqual(result._searchStr, "test pdf a description physics john doe");
            assert.strictEqual(result._formattedDate, "Jan 1, 2023"); // Format depends on local timezone but generally this
            assert.strictEqual(result._isNew, false);
        }
    },
    {
        name: "New document",
        input: {
            title: "New PDF",
            description: "New",
            category: "Math",
            author: "Jane Doe",
            uploadDate: new Date().toISOString()
        },
        verify: (result) => {
            assert.strictEqual(result._isNew, true);
        }
    },
    {
         name: "Firestore timestamp format",
         input: {
             title: "Firestore PDF",
             description: "Desc",
             category: "Chemistry",
             author: "Bob",
             uploadDate: {
                 toDate: () => new Date("2023-05-15T12:00:00Z")
             }
         },
         verify: (result) => {
             assert.strictEqual(result._formattedDate, "May 15, 2023");
         }
    }
];

let failed = false;
for (const test of tests) {
    try {
        const result = context.prepareSearchIndex({...test.input});
        test.verify(result);
        console.log(`✅ ${test.name}`);
    } catch (e) {
        console.error(`❌ ${test.name} failed:`, e.message);
        failed = true;
    }
}

if (failed) process.exit(1);
console.log("All prepareSearchIndex tests passed!");
