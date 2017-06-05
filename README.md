***Video Portal backend***


This is the backend API code that needs to be consumed by front-end applications.

All front-end related files are located in "/client" folder.

***Front-end application introduction***


This is a single page app that is developed mainly base on AngularJS 1,Masonry.js, and Bootstrap. 

* User may need to login to view the contents. Authenticated user will see video listings on index page.  

* Only 10 videos will be loaded initially, more videos will be loaded when scrolling down. 
* Maximum 50 videos for one page, click ```Next page``` for more videos.

To run application:
1. Ensure MongoDB is running
2. Run ‘npm install’ to download npm packages. 
3. Run ‘npm start’ to start the backend API. 
4. Visit app at http://localhost:8080/ 
5. Login with username 'ali' or 'tom' or 'harry' and password as 'password'6. Click ```Logout``` before leaving the page.

## Unit test
This project use "Jasmine" and "Karma", and browser "Phantomjs" for unit testing.
* Unit test file is located in "/client/unit_test/test.js" Before running the test, "phantomjs" need to be installed "npm install phantomjs" then, run "karma start"
* Since the test is developing and running on "C9 Cloud", "Karma" configuration will be slightly [different](https://karma-runner.github.io/
