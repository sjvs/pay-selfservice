'use strict';
var exit = ()=> process.exit();
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL NOT SET, have you used ./env.sh?');
  exit();
  return;
}

var userService = require('./app/services/user_service.js');

var chalk = require('chalk');
var argv = require('yargs')
  .usage('Usage: $0 -u [username]')
  .demand(['u'])
  .describe('u', 'username of the user to be enabled')
  .argv;

var username = argv.u;


userService.findByUsername(username)
  .then(
    (user)=>
      user.toggleDisabled(false).then(()=> {
        console.log('user enabled');
        exit();
      }),
    ()=> {
      console.log('cant find user');
      exit();
    }
  );
