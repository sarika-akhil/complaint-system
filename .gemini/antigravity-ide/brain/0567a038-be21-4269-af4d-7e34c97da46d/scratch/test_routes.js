const http = require('http');
const express = require('express');
const app = express();
const path = require('path');

const frontendPath = path.resolve('frontend');

app.use(express.static(frontendPath));

app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

const server = app.listen(5099, async () => {
  console.log('Test server running on 5099');
  
  http.get('http://localhost:5099/', (res) => {
    console.log('Status GET /:', res.statusCode);
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Body length GET /:', data.length);
      console.log('Contains <!DOCTYPE html>?:', data.includes('<!DOCTYPE html>'));
      server.close();
    });
  }).on('error', (err) => {
    console.error('Error:', err.message);
    server.close();
  });
});
