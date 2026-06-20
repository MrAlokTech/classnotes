const assert = require('assert');
const fs = require('fs');

const scriptContent = fs.readFileSync('script.js', 'utf8');

const inferLabelMatch = scriptContent.match(/function inferLabelFromTitle\(title\) \{[\s\S]*?return "notes";\n\}/);
if (inferLabelMatch) {
    eval(inferLabelMatch[0]);
    assert.strictEqual(inferLabelFromTitle('Chemistry Notes'), 'notes');
    assert.strictEqual(inferLabelFromTitle('Math Syllabus 2024'), 'syllabus');
    assert.strictEqual(inferLabelFromTitle('Physics Exam Question Paper'), 'question paper');
    assert.strictEqual(inferLabelFromTitle('Assignment 1'), 'assignment');
    console.log('test_inferLabel.js passed');
} else {
    console.log('inferLabelFromTitle not found');
}
