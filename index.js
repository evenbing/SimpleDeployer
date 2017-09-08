'use strict';

const http = require('http');
const url = require('url');
const exec = require('child_process').exec;
let cfg = './config';
if(process.env.NODE_ENV === 'test') {
  cfg = './config.test.js';
}

const config = require(cfg);
const tasks = config.tasks;

const port = config.port || 8300;

function execCommand(command, cb) {
  exec(command, function (err, stdout, stderr){
    if(err) cb(err);
    // console.log(`stderr: ${ stderr }`);
    cb(null);
  });
}

http.createServer((req, res) => {
  const request = url.parse(req.url, true);
  const taskName = request.pathname.slice(1);
  if(!taskName) {
    res.writeHead(404);
    return res.end();
  }

  const task = tasks[taskName];
  if(!task) return res.end('Task Error!');
  if(task.token) {
    if(!request.query.token || request.query.token !== task.token) {
      // console.log(`Token error: ${ request.query.token } !== ${ task.token }`);
      return res.end('Token Error!');
    }
  }
  if(!task.command) return res.end('Task Error!');

  if(req.method === 'POST' && task.type && task.branch) {
    const body = [];
    req.on('data', (chunk) => {
      body.push(chunk);
    }).on('end', () => {
      const bodyString = Buffer.concat(body).toString();
      try {
        const json = JSON.parse(bodyString);
        let run = false;
        switch (task.type) {
        case 'gitlab':
          run = json.ref.indexOf(task.branch) > -1;
          break;
        
        default:
          break;
        }

        if (run) {
          execCommand(task.command, (err) => {
            res.end(err || 'Done!');
          });
        } else {
          res.end('OK!');
        }
      } catch (error) {
        res.end(error);
      }
    });
  } else {
    execCommand(task.command, (err) => {
      res.end(err || 'Done!');
    });
  }
}).listen(port);
