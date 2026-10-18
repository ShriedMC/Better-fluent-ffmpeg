'use strict';

// Inspect npm's actual file selection, including generated local artifacts.
var assert = require('node:assert/strict');
var execFileSync = require('node:child_process').execFileSync;
var files = JSON.parse(execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['pack', '--dry-run', '--json'], { encoding: 'utf8' }))[0].files.map(function(file) {
    return file.path;
  });

['index.js', 'package.json', 'README.md', 'CHANGELOG.md', 'LICENSE', 'lib/processor.js'].forEach(function(file) {
  assert.ok(files.includes(file), 'Missing package file: ' + file);
});
files.forEach(function(file) {
  assert.ok(['index.js', 'package.json', 'README.md', 'CHANGELOG.md', 'LICENSE'].includes(file) || file.startsWith('lib/'),
    'Unexpected package file: ' + file);
});
console.log('Package contents verified (' + files.length + ' files).');
