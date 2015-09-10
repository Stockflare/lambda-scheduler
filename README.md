# Lambda Scheduler

| Staging | Production |
|:-:|:-:|
|[![Build Status](http://drone.stocktio.com/api/badge/github.com/Stockflare/lambda-scheduler/status.svg?branch=master)](http://drone.stocktio.com/github.com/Stockflare/lambda-scheduler)| --- |

This lambda function is designed to work in conjunction with the Scheduler System. This function integrates with AWS Cloudformation, enabling the definition of recurring tasks within your templates. See below for some example usage.

## Reference

Use the `Custom::Scheduler` task inside your Cloudformation, to define recurring arbitrary tasks, to be executed on a specific ECS Cluster using a provided Task Definition and an optional override. In-order for the tasks to be triggered, you must be using the [Schedulr Service](#).

```
{
  "Type" : "AWS::CloudFormation::CustomResource",
  "Properties" : {
    "ServiceToken" : * <String> [The Scheduler Lambda Function ARN],
    "Table" : * <String> [Name of the DynamoDB Table to add this recurring task to],
    "Task" : {
      "Recurrence" : * <String> [Cron style time format],
      "Cluster" : * <String> [Reference to ECS Cluster name],
      "TaskDefinition" : * <String> [Reference to the ECS Task Definition and Revision],
      "StartTime" : <Timestamp> [The time in UTC for this schedule to start],
      "EndTime" : <TimeStamp> [The time in UTC for this schedule to end]
      "Overrides" : [
        {
          "Name": <String> [Override name of the container instance],
          "Command": <Array<String>> [Override command to be executed],
          "Environment": [
            {
              "Name": <String> [Environment name override],
              "Value": <String> [Environment value override]
            },
            ...
          ],
        },
        ...
      ]
    }
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

    "ECSCluster": {
      "Type": "AWS::ECS::Cluster"
    },

    "ECSTaskDefinition" : {
      "Type" : "AWS::ECS::TaskDefinition",
      "Properties" : {
        ...
      }
    }

    "Task": {
      "Type": "Custom::Scheduler",
      "Properties": {
        "ServiceToken": { "Fn::GetAtt" : ["Scheduler", "TokenArn"] },
        "Table" : { "Fn::GetAtt" : ["Scheduler", "Table"] },
        "Task" : {
          "Recurrence" : "0 */6 * * *",
          "Cluster" : { "Ref" : "ECSCluster" },
          "TaskDefinition" : { "Ref" : "ECSTaskDefinition" },
          "Overrides" : [{
            "Name": "some_rake_task",
            "Command": ["rake", "some:task"]
          }]
        }
      }
    }

    ...
  }
}
```

_Note: The reference here to a resource named `Scheduler` is a [StackOutputs resource](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/walkthrough-custom-resources-lambda-cross-stack-ref.html), enabling access to the outputs from the Cloudformation inside this template._

---

When the lambda function is called, it will create the following entry inside the provided DynamoDB table:

| Key             | Value                                                          |
|-----------------|----------------------------------------------------------------|
| id              | `"d92b4866-1fb3-4606-8c95-7fe4610e4662"`                       |
| cluster         | `"some-cluster-name"`                                          |
| task_definition | `"arn:...ecs-task/1"`                                          |
| recurrence      | `"0 */6 * * *"`                                                |
| overrides       | `"[{"Name":"some_rake_task","Command":["rake","some:task"]}]"` |
| start_time      | `"2015-09-07T12:57:48.489Z"`                                   |
| end_time        | `null`                                                         |
