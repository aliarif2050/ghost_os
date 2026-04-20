const { execSync } = require('child_process');
const fs = require('fs');
fs.mkdirSync('./report/results', { recursive: true });
const output = execSync('.\\kernel\\build\\ghostkernel_engine.exe', { input: '{"cmd":"experiment_run"}\n{"cmd":"exit"}\n' });
fs.writeFileSync('./report/results/experiment_results.json', output);
