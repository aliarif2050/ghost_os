const fs = require('fs');
fetch('http://localhost:3001/command', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ cmd: 'experiment_run' })
}).then(r => r.json()).then(data => {
  fs.mkdirSync('./report/results', { recursive: true });
  fs.writeFileSync('./report/results/experiment_results.json', JSON.stringify(data.results, null, 2));
  console.log('done');
}).catch(console.error);
