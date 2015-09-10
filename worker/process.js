console.log('Start');

var aws = require('aws-sdk');
var _ = require('underscore');
var schedule = require('node-schedule');
var moment = require('moment');

var region = process.env.AWS_REGION;
var table = process.env.DYNAMO_TABLE;

// Make the start time in the far past for startup
var last_schedule_time = moment().subtract(10, 'years');

var dynamo = new aws.DynamoDB({ region: region });
var ecs = new aws.ECS({ region: region });

var jobs = {};


var keysToLowerCase = function keysToLowerCase(obj) {
    if (!typeof(obj) === "object" || typeof(obj) === "string" || typeof(obj) === "number" || typeof(obj) === "boolean") {
        return obj;
    }
    var keys = Object.keys(obj);
    var n = keys.length;
    var lowKey;
    while (n--) {
        var key = keys[n];
        if (key === (lowKey = key.toLowerCase()))
            continue;
        obj[lowKey] = keysToLowerCase(obj[key]);
        delete obj[key];
    }
    return (obj);
};

var getAllDBJobs = function(fn) {
  result = dynamo.scan({
    TableName: table,
    Limit: 1000
  }, function(err, data){
    var return_data = [];

    if (!_.isNull(data) && !_.isUndefined(data.Count) && data.Count > 0) {

      _.each(data.Items, function(item, index, items){
        console.log('Item');
        console.log(item.id, item.task, item.last_updated);
        var r = {};

        // Set up the item and create any defaults
        r.id = item.id.S;
        r.last_updated = item.last_updated.S;
        r.task = JSON.parse(item.task.S);
        r.last_run =item.last_run.S;

        if (_.isUndefined(r.task.StartTime)) {
          r.task.StartTime = moment().toISOString();
        }

        if (_.isUndefined(r.task.EndTime)) {
          r.task.EndTime = moment().add(10, 'years').toISOString();
        }

        // Convert the Overrides to an object with Lower case keys
        if (!_.isUndefined(r.task.Overrides)) {
          _.each(r.task.Overrides, function(o, i, ovs){
            if (!_.isUndefined(o.Environment)) {
              _.each(o.Environment, function(e, i, envs){
                 e = keysToLowerCase(e);
              }, this);
            }
            o = keysToLowerCase(o);
          }, this);
        }

        // only include the job if it should be Running
        if (moment(r.task.StartTime).isBefore(moment()) && moment(r.task.EndTime).isAfter(moment())) {
          return_data.push(r);
        }

      }, this);

    }
    fn(err, return_data);
  });
};

var executeJob = function(db_job) {
  console.log('Running Job:', db_job.id);
  var params = {
    taskDefinition: db_job.task.TaskDefinition, /* required */
    cluster: db_job.task.Cluster,
    count: 1,
    startedBy: 'lambda-scheduler'
  };

  if (!_.isUndefined(db_job.task.Overrides)) {
    params.overrides = {
      containerOverrides: db_job.task.Overrides
    };
  }

  ecs.runTask(params, function(err, data) {
    console.log('err, data');
    console.log(err, data);
    if (err) console.log(err, err.stack); // an error occurred
    else     console.log(data);           // successful response
  });

  // Update the last run time
  dynamo.updateItem({
    TableName: table,
    Key: {
      id: { S: db_job.id },
    },
    AttributeUpdates: {
      last_run: { Action: "PUT",
                  Value: { S: moment().toISOString() }
      }
    }
  }, function(err, data){
    if (err) console.log('Update call failed', err, data);
  });
};

var setUpJobs = function() {
  getAllDBJobs(function(err, db_jobs){
    if (db_jobs.length > 0 ) {
      // deal with any new or updated jobs
      _.each(db_jobs, function(db_job, index, db_jobs){
        // Does this job have a reccurrence schedule
        if (!_.isUndefined(db_job.task.Recurrence)) {
          // Schedule the job for reccuring execute

          var job = jobs[db_job.id];
          if (!_.isUndefined(job)) {
            if (last_schedule_time.isBefore(moment(db_job.last_updated))) {
              console.log("Rescheduling Job: ", db_job.id);
              job.cancel();
              job = schedule.scheduleJob(db_job.task.Recurrence, function(){
                     executeJob(db_job);
              });
              jobs[db_job.id] = job;

              // Note the time you last scheduled jobs
              last_schedule_time = moment();
            }
          } else {
            console.log("Scheduling Job: ", db_job.id);
            job = schedule.scheduleJob(db_job.task.Recurrence, function(){
                   executeJob(db_job);
            });
            jobs[db_job.id] = job;

            // Note the time you last scheduled jobs
            last_schedule_time = moment();
          }

        } else {
          // This is a one off job so just check to see if it has run already

          if (db_job.last_run === '-') {
            // Job has never run so execute it Now
            console.log('Executing one-off Job: ', db_job.id);
            executeJob(db_job);
          }

        }
      });
    }

    // Now deal with any jobs that have been deleted or are no longer included
    _.each(_.keys(jobs), function(job_key, index, job_keys){
      var found_job = _.find(db_jobs, function(db_job){
        if (db_job.id === job_key) {
          return true;
        } else {
          return false;
        }
      }, this);
      if (_.isUndefined(found_job)) {
        console.log('Cancelling deleted / expired Job:', job_key);
        jobs[job_key].cancel();
        delete jobs[job_key];
      }
    }, this);
  });
};



setUpJobs();



setInterval(function() {
  console.log('Checking for Job Changes');
  setUpJobs();
  console.log(jobs);
}, 60000);

console.log("Exit");
