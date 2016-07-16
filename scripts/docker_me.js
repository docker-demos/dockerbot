// Commands:
//
//  docker list - Lists all existing services in the Docker Cluster
//  docker scale <app-name> to <number of instances> - Scales an existing docker instance in the cluster to the provided number of instances
//  docker deploy <app-name> - Deploys a new app to the Docker cluster, app-name must be a valid hostname and a proper marathon deploy file must be publicly available at the S3 location
//  docker destroy <app-name> - Removes an existing app from the Docker cluster
//  docker restart <app-name> - Restarts an existing app in the Docker cluster


module.exports = function(robot) {
  var dockerHelper = require('../lib/dockerhelper'),
    _ = require('lodash'),
      respondSuccess,
      reportError;

      respondSuccess = function(req, res) {
        if (req.announcement) res.send(req.announcement);
        if (req.status === 'success' && req.message ) { res.send(req.message); }
      };

      reportError = function(err, res) {
        res.send(err.announcement);
      };

      robot.router.get("/healthcheck", function(req, res) {
        res.writeHead(200, {
          'Content-Type': 'text/plain'
        });
        return res.end('dockerbot is listening\n');
      });

      robot.respond(/list$/i, function(res) {
        dockerHelper.list().then(
          _.partialRight(respondSuccess, res))
          .catch(_.partialRight(reportError, res));
      });

      robot.respond(/scale ([\w-]+) to (\d+)$/i, function(res) {
        dockerHelper.deploy().then(
          _.partialRight(respondSuccess, res))
          .catch(_.partialRight(reportError, res));
      });

      robot.respond(/(deploy|destroy|restart) ([\w-]+)$/i, function(res) {
        var requestor = res.message.user,
          action = res.match[1],
          app= res.match[2];
        dockerHelper.control({action: action, app: app, requestor: requestor}).then(
          _.partialRight(respondSuccess, res))
          .catch(_.partialRight(reportError, res));
      });
};
