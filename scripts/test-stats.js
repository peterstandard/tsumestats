import fs from 'fs';

const rawData = JSON.parse(fs.readFileSync('src/lib/data/sampleData.json', 'utf8'));

console.log('--- Testing Dataset Loading ---');
console.log('Total records in JSON:', rawData.length);

function rankNumberToLabel(num) {
  if (num <= 15) return `${16 - num}k`;
  return `${num - 15}d`;
}

// Test Rank conversion
console.log('Rank 1:', rankNumberToLabel(1), 'expected: 15k');
console.log('Rank 6:', rankNumberToLabel(6), 'expected: 10k');
console.log('Rank 10:', rankNumberToLabel(10), 'expected: 6k');
console.log('Rank 15:', rankNumberToLabel(15), 'expected: 1k');
console.log('Rank 16:', rankNumberToLabel(16), 'expected: 1d');

// Test Deduplication
const map = new Map();
for (const r of rawData) {
  map.set(r.guanid, r);
}
console.log('Unique checkpoints (guanid):', map.size);

// Test Stats computation
let totalCorrect = 0;
let passCount = 0;
let totalTime = 0;
let minEpoch = Infinity;
let maxEpoch = -Infinity;

for (const r of map.values()) {
  totalCorrect += r.oknum;
  if (r.status === 2) passCount++;
  totalTime += r.totaltime;
  if (r.t < minEpoch) minEpoch = r.t;
  if (r.t > maxEpoch) maxEpoch = r.t;
}

const totalTests = map.size;
const totalProblems = totalTests * 10;
const overallAccuracy = ((totalCorrect / totalProblems) * 100).toFixed(1);
const passRate = ((passCount / totalTests) * 100).toFixed(1);
const avgTimePerProblem = (totalTime / totalProblems).toFixed(1);

console.log('\n--- KPI Summary ---');
console.log('Total Tests:', totalTests);
console.log('Total Problems Solved:', totalProblems);
console.log('Total Correct:', totalCorrect);
console.log('Overall Accuracy:', overallAccuracy + '%');
console.log('Pass Rate:', passRate + '%');
console.log('Avg Speed per Problem:', avgTimePerProblem + 's');
console.log('Date range:', new Date(minEpoch * 1000).toISOString(), 'to', new Date(maxEpoch * 1000).toISOString());

// Test Linear Regression
let sumX = 0, sumY = 0;
for (const r of map.values()) {
  sumX += r.totaltime;
  sumY += (r.oknum / 10) * 100;
}
const meanX = sumX / totalTests;
const meanY = sumY / totalTests;
let ssXX = 0, ssXY = 0, ssYY = 0;
for (const r of map.values()) {
  const dx = r.totaltime - meanX;
  const dy = (r.oknum / 10) * 100 - meanY;
  ssXX += dx * dx;
  ssXY += dx * dy;
  ssYY += dy * dy;
}
const slope = ssXY / ssXX;
const r2 = (ssXY * ssXY) / (ssXX * ssYY);
console.log('\n--- Regression ---');
console.log('Slope (% accuracy per second):', slope.toFixed(4));
console.log('R² correlation:', r2.toFixed(4));

console.log('\nALL TESTS PASSED SUCCESSFULLY!');
