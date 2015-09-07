# Lambda Scheduler

| Staging | Production |
|:-:|:-:|
| --- | --- |

This lambda function is designed to work in conjunction with the Scheduler System. This function integrates with AWS Cloudformation, enabling the definition of recurring tasks within your templates. See below for some example usage.

## Optional Requirements

* [Schedulr Gem](#) for integrating the task scheduler into your application.
* [Schedulr Service](#) for listening and triggering tasks that are ready to be scheduled.

## Reference

Use the `Custom::Scheduler` task inside your Cloudformation, to define recurring arbitrary tasks, to be executed by a listener ([Schedulr Gem](#)) integrated into your application using an SQS queue. In-order for the tasks to be triggered, you must be using the [Schedulr Service](#).

```
{
  "Type" : "Custom::Scheduler",
  "Properties" : {
    "ServiceToken" : * <String> [The Scheduler Lambda Function ARN],
    "Table" : * <String> [Name of the DynamoDB Table to add this recurring task to],
    "Region" : * <String> [AWS Region Name],
    "Definitions" : [
      {
        "Id" : * <String> [Unique identifier for this task],
        "Type" : * <String> [Only SQS value supported],
        "Name" : * <String> [SQS Queue name],
        "StartTime" : <Timestamp> [The time in UTC for this schedule to start],
        "EndTime" : <TimeStamp> [The time in UTC for this schedule to end]
        "Recurrence" : * <String> [Cron style time format],
        "Message" : * {
          "$" : * <Array> [ <String> [Bash command to execute], ... ]
        }
      },
      ...
    ]
  }
}
```

**Note:** All asteriks (*) denote a required field.

## Example Usage

This example defines a task that is scheduled to execute a simple rake task every 6 hours.

```
{
  "Resources" : {
    ...

    "Task": {
      "Type": "Custom::Scheduler",
      "Properties": {
        "ServiceToken": { "Fn::GetAtt" : ["Scheduler", "TokenArn"] },
        "Table" : { "Fn::GetAtt" : ["Scheduler", "Table"] },
        "Region" : { "Ref" : "AWS::Region" },
        "Definitions" : [
          {
            "Id" : "SomeTaskHarvester",
            "Type" : "SQS",
            "Name" : { "Fn::GetAtt" : ["TaskQueue", "QueueName"] },
            "Recurrence" : "0 */6 * * *",
            "Message" : {
              "$" : ["rake do:some:task"]
            }
          }
        ]
      }
    },

    "TaskQueue" : {
      "Type" : "AWS::SQS::Queue"
    },

    ...
  }
}
```

_Note: The reference here to a resource named `Scheduler` is a [StackOutputs resource](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/walkthrough-custom-resources-lambda-cross-stack-ref.html), enabling access to the outputs from the Cloudformation inside this template._

When the lambda function is called, it will create the following entry inside the provided DynamoDB table:

| id                  | type  | name                      | recurrence    | message                       | start_time                 | end_time |
|---------------------|-------|---------------------------|---------------|-------------------------------|----------------------------|----------|
| `SomeTaskHarvester` | `SQS` | `9498234-some-queue-name` | `0 */6 * * *` | `{"$":["rake do:some:task"]}` | `2015-09-07T12:57:48.489Z` | `null`   |
