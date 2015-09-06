console.log('Loading function');

exports.handler = function(event, context) {
  // dependencies
  var aws = require('aws-sdk');
  var response = require('cfn-response');

  // set variables
  var region = event.ResourceProperties.Region;
  var table = event.ResourceProperties.Table;

  // initialize Dynamo using the correct region
  var dynamo = new aws.DynamoDB({ region: region });

  // batch create tasks inside Dynamo
  var create = function(definitions, fn) {
    var obj = { RequestItems: {} };
    obj.RequestItems[table] = definitions.map(function(def) {
      return { PutRequest: item(def) }
    });
    return dynamo.batchWriteItem(obj, fn);
  };

  // batch delete tasks inside Dynamo
  var delete = function(definitions, fn) {
    var obj = { RequestItems: {} };
    obj.RequestItems[table] = definitions.map(function(def) {
      return { DeleteRequest: key(def) }
    });
    return dynamo.batchWriteItem(obj, fn);
  };

  // handle errors encountered
  var onError = function(err, data) {
    var resp = { Error: err };
    console.log(resp.Error + ':\\n', err);
    response.send(event, context, response.FAILED, resp);
  };

  // map the new and old resource definitions
  var defs = event.ResourceProperties.Definitions;
  var oldDefs = event.OldResourceProperties.Definitions;

  switch(event.RequestType) {
    case 'Create':
      // just create tasks...
      create(defs, function(err, data) {
        if (err) onError('Create call failed', data);
        else response.send(event, context, response.SUCCESS, {});
      });
      break;
    case 'Update':
      // first delete, then update the tasks
      delete(oldDefs, function(err, data) {
        if (err) onError('Update (Delete) call failed', data);
        else create(defs, function(err, data) {
          if (err) onError('Update (Create) call failed', data);
          else response.send(event, context, response.SUCCESS, {});
        });
      });
      break;
    case 'Delete':
      // delete the tasks
      delete(defs, function(err, data) {
        if (err) onError('Delete call failed', data);
        else response.send(event, context, response.SUCCESS, {});
      });
      break;
  }
};

var key = function(task) {
  return { Key: { id: { S: task.Id } } }
}

var item = function(task) {
  return { Item: {
    id: { S: task.Id },
    start_time: { S: task.StartTime },
    end_time: { S: task.EndTime },
    recurrence: { S: task.Recurrence },
    type: { S: task.Type },
    name: { S: task.Name },
    message: { S: JSON.stringify(task.Message) }
  } };
};
