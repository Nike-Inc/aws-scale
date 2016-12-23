# Change Log

### 1.2.0 - Dec 22, 2016
* Added scale status polling. Now you can scale resources and monitor their scale progress.

### 1.1.0 - Dec 18, 2016
* Added setMinSize to AutoScaleGroup parameter object. If set to true, scale operation will first set minimum size of
ASG to match desired capacity before modifying instance count.

### 1.0.0 - Dec 17, 2016
* Initial release!
* Added ResourceSet to link scaling operations between AWS resource together.
* Added scaling resource objects for DynamoDB and AutoScaling groups. 