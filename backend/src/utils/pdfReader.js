const fs = require('fs');
const pdf = require('pdf-parse');

const filePath = process.argv[2];
if (!filePath) {
  console.error('请提供PDF文件路径');
  process.exit(1);
}

const dataBuffer = fs.readFileSync(filePath);

pdf(dataBuffer).then(function(data) {
  console.log(data.text);
}); 