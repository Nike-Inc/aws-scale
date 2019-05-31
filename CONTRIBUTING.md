# How to contribute

Welcome! Thank you for contributing to aws-scale.

### Design Philosophy 

* Test Driven Development - I believe TDD leads to cleaner, less buggy code. As such, I'd encourage you
to try TDD when contributing if you are not already doing so.
* Security - it's vital this library maintains its security integrity. Always keep an eye out for vulnerabilities and
please report anything you find either directly to me or via GitHub.

### Checklist

Before opening your pull request, please do the following:

* Run ```npm test```. All tests should pass.
* Run ```npm run coverage```. Code coverage should be 100%.
* Manually use your new feature and try to find missed edge cases. Sometimes tests don't match reality.