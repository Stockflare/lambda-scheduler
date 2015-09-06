# AWS Cloudformation

Launches the Harvester for the News API.

**[26/07/15] Important: Once the stack has been created. You must manually bind the Kinesis stream as an event source. As of now the binding of Lambda<->Kinesis is not currently supported.**

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
