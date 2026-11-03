const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { describeDatabaseError } = require('../config/db');

test('database errors identify DNS, authentication and configuration without leaking credentials', () => {
  assert.equal(describeDatabaseError({reason:{servers:new Map([['host',{error:{cause:{code:'ENOTFOUND'}}}]])}}).code, 'DATABASE_DNS_ERROR');
  assert.equal(describeDatabaseError({code:18}).code, 'DATABASE_AUTH_ERROR');
  assert.equal(describeDatabaseError({code:8000,message:'bad auth : authentication failed'}).code, 'DATABASE_AUTH_ERROR');
  assert.equal(describeDatabaseError({name:'MongoParseError',message:'Invalid connection string'}).code, 'DATABASE_CONFIG_ERROR');
  assert.equal(describeDatabaseError({code:'DATABASE_CONFIG_ERROR',message:'Set a valid MONGODB_URI.'}).code, 'DATABASE_CONFIG_ERROR');
  assert(!JSON.stringify(describeDatabaseError(new Error('mongodb://user:secret@host'))).includes('secret'));
});

test('HTTP server stays alive and returns actionable 503 responses when MongoDB cannot resolve', {timeout:30000}, async () => {
  const child = spawn(process.execPath, [path.join(__dirname,'../server.js')], {
    cwd:path.join(__dirname,'..'), windowsHide:true,
    env:{...process.env,PORT:'15631',MONGODB_URI:'mongodb://does-not-exist.invalid:27017/crm'},
    stdio:['ignore','pipe','pipe'],
  });
  let output=''; child.stdout.on('data', chunk => {output+=chunk;}); child.stderr.on('data',chunk=>{output+=chunk;});
  try {
    let response;
    for(let attempt=0;attempt<110;attempt++) {
      try { response=await fetch('http://127.0.0.1:15631/api/health');const body=await response.json();if(body.code==='DATABASE_DNS_ERROR')break; } catch { /* Wait for startup. */ }
      await new Promise(resolve=>setTimeout(resolve,200));
    }
    assert.equal(response?.status,503);
    const report=await fetch('http://127.0.0.1:15631/api/employees');
    assert.equal(report.status,503);assert.equal(report.headers.get('retry-after'),'5');
    assert.equal((await report.json()).code,'DATABASE_DNS_ERROR');
    assert.equal(child.exitCode,null);assert(output.includes('Retrying MongoDB connection'));
  } finally {child.kill();}
});
