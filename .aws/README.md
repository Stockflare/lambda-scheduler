# AWS Cloudformation

Lambda function that adds entries to a DynamoDB Scheduler Table

### Dependencies

| Stack                | Description                              |
|----------------------|------------------------------------------|
| lambda-stack-outputs | Lambda Stack Outputs Cloudformation      |
| environment          | Environment Configuration Cloudformation |

---

### Parameters

Should be configured from the appropriate configuration file within this folder.

| Parameter       | Default | Description                                                         |
|-----------------|---------|---------------------------------------------------------------------|
| FunctionPackage | `null`  | Prefix of the package name residing within the resources S3 bucket. |
| FunctionVersion | `null`  | Package key suffix of the version that will be deployed to lambda.  |
