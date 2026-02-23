const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.js')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('frontend/src');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Replace dark mode RGBA strings with light mode counterparts
    content = content.replace(/rgba\(255,255,255,0\.03\)/g, "rgba(15,23,42,0.04)");
    content = content.replace(/rgba\(255,255,255,0\.04\)/g, "rgba(15,23,42,0.05)");
    content = content.replace(/rgba\(255,255,255,0\.06\)/g, "rgba(15,23,42,0.08)");
    content = content.replace(/rgba\(255,255,255,0\.08\)/g, "rgba(15,23,42,0.08)");
    content = content.replace(/rgba\(255,255,255,0\.1\)/g, "rgba(15,23,42,0.1)");
    content = content.replace(/rgba\(255,255,255,0\.01\)/g, "rgba(15,23,42,0.02)");

    // Spaces in rgba
    content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.03\)/g, "rgba(15,23,42,0.04)");
    content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.04\)/g, "rgba(15,23,42,0.05)");
    content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.06\)/g, "rgba(15,23,42,0.08)");

    // Tooltip backgrounds
    content = content.replace(/rgba\(10,22,40,0\.95\)/g, "rgba(255,255,255,0.95)");
    content = content.replace(/rgba\(14,26,46,0\.8\)/g, "rgba(255,255,255,0.85)");

    // Text colors (chart labels, etc.)
    content = content.replace(/color:\s*'#fff'/g, "color: '#64748b'");
    content = content.replace(/color:\s*'#ffffff'/g, "color: '#64748b'");
    content = content.replace(/color:\s*'rgba\(255,255,255,0\.6\)'/g, "color: 'rgba(15,23,42,0.6)'");

    // Other dark backgrounds to light
    content = content.replace(/color="white"/g, 'color="#0f172a"');
    content = content.replace(/color:\s*'white'/g, "color: '#0f172a'");

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log(`Updated ${file}`);
    }
});
console.log('Done replacing values in JS files.');
