# Change Log

### 1.3.1 - Jan 8, 2017
* Fixed bug where DynamoDB scale status polling was ignoring the status of global indexes. Polling now waits for 
both table and global index scaling to complete.

### 1.3.0 - Jan 5, 2017
* Added ignoreUnchangedCapacityUpdates DynamoDB feature. DynamoDB will now ignore updates that already match current table throughput.
Automatic scaling operations will not fail if the desired capacity is already set for the table or global indexes.

### 1.2.0 - Dec 22, 2016
* Added scale status polling. Now you can scale resources and monitor their scale progress.

### 1.1.0 - Dec 18, 2016
* Added setMinSize to AutoScaleGroup parameter object. If set to true, scale operation will first set minimum size of
ASG to match desired capacity before modifying instance count.

### 1.0.0 - Dec 17, 2016
* Initial release!
* Added ResourceSet to link scaling operations between AWS resource together.
* Added scaling resource objects for DynamoDB and AutoScaling groups. 