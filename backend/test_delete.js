const http = require('http');

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/api/v1/admin/leave-quotas/2',
  method: 'DELETE',
  headers: {
    'Authorization': 'Bearer ' + 'dummy', // Wait, I need a valid token. Or I can just bypass auth for testing.
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});
req.end();
