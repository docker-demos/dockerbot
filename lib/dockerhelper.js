'use strict';
var exports = module.exports = {},
    _ = require('lodash'),
    fs = require('fs'),
    Promise = require('bluebird'),
    moment = require('moment'),
    https = require('https'),
    PromiseRequest,
    rootDomain= 'services.docker-demos.com',
    Table = require('cli-table2'),
    marathon = require('marathon-node')(process.env.MARATHON_URL);

PromiseRequest = Promise.method(function(options) {
  return new Promise(function(resolve, reject) {
    var request = https.request(options, function(response) {
      var result = response;
      result.body = '';
      response.on('data', function(chunk) {
        result.body +=chunk;
      });
      response.on('end', function(res) {
        resolve(result);
      });
    });
    request.on('error', function(err) {
      reject(err);
    });
    request.end();
  });
});

function listApps(){
  return marathon.app.getList();
}

function updateApp(state){
  return marathon.app.update(state.app, state.body, false);
}

function restartApp(state){
  return marathon.app.restart(state.app, false);
}

function destroyApp(state){
  return marathon.app.destroy(state.app);
}

function createApp(state){
  console.log(state);
  return makeRequestForConfig(state.app)
  .then(marathon.app.create);
}

function makeRequestForConfig(appId) {
  var params = {
    method: 'GET',
    host:'raw.githubusercontent.com',
    path: `/docker-demos/demo-apps/master/${appId}/marathon-app.json`,
    port: 443
  };
  return PromiseRequest(params);
}

function sendResponse(attrs, state) {
  var templates = {announcement: state.announceTemplate},
      response = {};
  state.attrs = attrs;
  if (state.messageTemplate) templates.message = state.messageTemplate;
  _.forEach(templates, function(file, type) {
    var filePath = __dirname + '/templates/' + file;
    if (fs.existsSync(filePath)) {
      var template = _.template(fs.readFileSync(filePath));
      response[type] = template({temp: state});
    };
  });
  response.status = 'success';
  return response;
}

function reportError(error, state) {
  var response = {};
    response.status = 'error';
    console.log(error);
    response.announcement = "There was a problem with your request...";
    return response;
}


function parseAppsList(appsList, state) {
  appsList.apps = listTableFor(appsList.apps, state);
  return(appsList);
}

function listTableFor(appsList, state) {
  state.table = new Table({ head: state.tableHeaders,
                            style: { compact: true, border: [], head: [] } });
  var rows = rowsForTable(appsList, state);
  rows.forEach(function(row){ state.table.push(row) });
  return appsList.Reservations;
}

function rowsForTable(appsList, state) {
  var generatedRows = _.map(appsList, generateTableRowData);
  var flattenedRows = _.flatten(_.flatten(generatedRows));
  console.log('flattenedRows: ', flattenedRows);
  return _.map(flattenedRows, state.row);
}

function listRow(row) {
  if (row.idx) return [row.idx, row.id, row.instances, row.cpus, row.mem];
  return ['----', '--------------------------------', '--------------------', '-------------', '---------------'];
   return [{colSpan:5, content:'----------'}];
}

function generateTableRowData(app, index) {
  return {
    idx: index+1,
    id: app.id.replace('/', ''),
    instances: app.instances,
    cpus: app.cpus,
    mem: app.mem
  }
}

exports.control = function(state) {
  var state = state || {};
  var controls = {
    'deploy': createApp,
    'restart': restartApp,
    'destroy': destroyApp,
  };
  return controls[state.action](state)
  .then(_.partialRight(sendResponse, state))
  .catch(reportError);
};

exports.list = function(state) {
  var state = state || {};
  state.announceTemplate = 'services_table';
  state.tableHeaders = ['','app', 'instances', 'cpus', 'mem'];
  state.tableType = 'all';
  state.row = listRow;
  return listApps()
  .then(_.partialRight(parseAppsList, state))
  .then(_.partialRight(sendResponse, state))
  .catch(reportError);
};

exports.scale= function(state) {
  var state = state || {};
  return scaleApp()
  .then(_.partialRight(sendResponse, state))
  .catch(reportError);
};

