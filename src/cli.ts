#!/usr/bin/env node

import { readFileSync } from 'fs';
import { analyzeCode, formatAnalysis } from './index.js';

const args = process.argv.slice(2);
const command = args[0];

if (!command) {
  console.error('Usage: nuxscript <command> [file]');
  console.error('Commands: analyze, help');
  process.exit(1);
}

if (command === 'help') {
  console.log('nuxscript - Source code analysis tool');
  console.log('');
  console.log('Usage:');
  console.log('  nuxscript analyze <file>   Analyze a source file');
  console.log('  nuxscript help            Show this help');
  process.exit(0);
}

if (command === 'analyze') {
  const file = args[1];
  if (!file) {
    console.error('Error: Please specify a file to analyze');
    process.exit(1);
  }

  try {
    const code = readFileSync(file, 'utf-8');
    const result = analyzeCode(code);
    console.log(formatAnalysis(result));
  } catch (err) {
    console.error(`Error reading file: ${err}`);
    process.exit(1);
  }
} else {
  console.error(`Unknown command: ${command}`);
  console.error('Run "nuxscript help" for usage');
  process.exit(1);
}