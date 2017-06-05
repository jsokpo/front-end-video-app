'use strict';
var app=angular.module('app',['ngResource','angular-md5','wu.masonry']);

//use angular resource for http request
app.factory('myAjax', ['$resource', function($resource) {
    
    return $resource('/:directive/:branch', null);
        
}]);

app.directive('login', function () {
  return {
    restrict: 'E',
    templateUrl:'/template/login.html'
  };
});

app.directive('popup', function () {
  return {
    restrict: 'E',
    templateUrl:'/template/popup.html'
  };
});

app.directive('videos', function () {
  return {
    restrict: 'E',
    templateUrl:'/template/videos.html'
  };
});


/**
 * Goal: Request 10 more videos when scroll to the bottom of the DOM (Lazy loading)
 * Principle: Bind $window scroll event to a function, so every time page scroll, the function will
 * be called. The function will first check if scroll to the bottom or not, if yes, then check if the 
 * number of already loaded videos(=page.limit) have excess the current-page-max(currentPageNum * numVideosEachPage)
 * if not, will load more 10 videos, if yes, skip and do nothing.
 * #note that videos will be loaded 10 more than current-page-max, in order to check if there are more 
 * videos in next page. If no more video in next page, next page button will be hidden, otherwise be shown.
 */ 
app.directive("scroll", function ($window,$document) {
    return {
        scope:false,
        link:function(scope, element, attrs) {
            angular.element($window).bind("scroll", function() {

                if(this.scrollY + $window.innerHeight == $document.height() && scope.stopScrolling.flow!=='hidden') 
                {
                    
                    if(scope.page.currentPageNum * scope.page.numVideosEachPage >= scope.page.limit)
                    {
                        scope.page.limit += 10;
                        scope.getVideos(0,scope.page.limit); //load ten more videos each time
                    }
                    
                }
    
            });
        }
    };
});


/**
 * delete controls attribute from <video> element
 */ 
app.directive("removeControls", function ($timeout) {
    return {
        
        link:function(scope, element, attrs) {
                delete attrs.controls;
        }
    };
});


/**
 * Goal: divide videos into pages
 * This filter will slice a portion of array from $scope.videos, this portion will 
 * be shown on the screen. The slice begin and end are determine by $scope.page.currentPageNum
 * and $scope.page.numVideosEachPage
 */ 
app.filter('startFrom', function() {
    return function(input, currentPageNum, numVideosEachPage) {
        var c=currentPageNum;
        var n=numVideosEachPage;
        var begin=(c-1)*n;
        var end=  c*n;

        if(Object.keys(input).length !== 0 && currentPageNum>0 && numVideosEachPage>0) 
        {
            return input.slice(begin,end);
        }
        return [];
    };
});

//main controller
app.controller('AppController',['$scope','myAjax','md5','$timeout',function($scope,myAjax,md5,$timeout){
    
    $scope.login={};
    $scope.user={};
    $scope.videos={};
    $scope.popup={};
    $scope.stopScrolling={};
    $scope.page={
        pageBtn:{},
        currentPageNum:1,
        numVideosEachPage:50,
        limit:10
    };
    
    /**
     * Trigger after click the next page or last page btn
     * add or subtract 1 page number when click the next page btn or last page btn
     */
    $scope.page.pageBtn= function(dir){
        
        if(dir=='last' && $scope.page.currentPageNum>1)
        {
            $scope.page.currentPageNum--;

        }
        else if(dir=='next')
        {
            $scope.page.currentPageNum++;
        }

    };
    
    
    /**
     *Trigger after rating a video
     *popup.myRate record the rating number(eg. 3 of 5 star)
     *popup.rateStyle use for css styling while ng-repeat(eg.
     *[{color:'gold'},{color:'gold'}] will change first two star color to gold )
     *Finally, we will load() the video
     */
    $scope.rating= function(index){
        
        $scope.popup.myRate=index+1; //record my rating star number
        $scope.popup.rateStyle=[];
        
        Array.apply(null, Array(index+1)).map(function(){
                $scope.popup.rateStyle.push({color:'gold'});// styling
        });
    };
    
        
    /**
     *Trigger after open the popup window
     *Object(popup) will save all values from selected video
     *Furthermore, will create three new 'index','show', 'rateStyle' attributes
     *Finally, video will be loaded.
     */
    $scope.popupOpen=function(index) {
        
        $scope.stopScrolling.flow='hidden';//stop backgroud scrolling
        $scope.stopScrolling.pos='fixed';
        $scope.popup={};
        $scope.popup.index=index;
        $scope.popup.show=true;
        $scope.popup.rateStyle=[];
        // $scope.popup=Object.assign($scope.popup,$scope.videos[index]);//not support in es5
        Object.keys($scope.videos[index]).forEach(function(key) { $scope.popup[key] = $scope.videos[index][key]; });
        //need reload <video> element after change source
        var v = document.getElementById("popupVideo");
        v.load();
        
    };
    
    
    /**
     * Trigger after close the popup window
     * video will be paused, and sent rating to save in server.
     * If save success, server will return the a new video document,
     * then update rating related values.
     * (compare to old video ,new video document only update the rating attribute)
     */
    $scope.popupClose=function() {
        
        $scope.stopScrolling.flow=''; //enable scrolling
        $scope.stopScrolling.pos='';
        $scope.popup.show=false;
        
        var v = document.getElementById("popupVideo");
        v.pause();//pause video
        
        // Save rating in server
        if(typeof $scope.popup.myRate==="number" && $scope.popup.myRate>0)
        {
            myAjax.save(
                        {directive:'video', branch:'ratings', sessionId: $scope.user.sessionId}, 
                        {videoId: $scope.popup._id, rating: $scope.popup.myRate}
                        )
            .$promise
            .then(function(res){
                if(res.status=='success')
                {
                    var v=res.data;
                    var rateSum = v.ratings.reduce(function(x,y){return x+y});
                    var rateAvg = rateSum / parseFloat(v.ratings.length);
                    v.rateStar=new Array(Math.round(rateAvg)); //add rateStar[] attribue
                    $scope.videos[$scope.popup.index]=v; // update rating;
                    
                }
                else
                {
                    console.log(res.error);
                }
            },function(err){
                console.log(err);
            });
        }
        
    };    
    
    
    /**
     * Trigger after click the login button
     * If login success, it will save data from server
     * to user, including username and sessionId, then template 'videos' will 
     * show, template 'login' will hide(leave with animation). 
     * Finally, call getVideos function.
     */
    $scope.loginSubmit=function(){
        myAjax.save(
                    {directive:'user', branch:'auth'}, 
                    {username: $scope.login.username, password: md5.createHash($scope.login.password || '')}
                    )
        .$promise
        .then(function(res){
            if(res.status=='success')
            {
                $scope.login.error=null;
                $scope.user.username=res.username;
                $scope.user.sessionId=res.sessionId;
                $scope.login.animation="leave";
                
                $timeout(function () {
                    $scope.login.show='';
                    $scope.videos.push({}); //force masonry to redraw
                    $timeout(function() {
                        $scope.videos.pop({});
                    },1);
                }, 1000);
                
                $scope.getVideos(0,10);
            }
            else
            {
                $scope.login.error=true;
                $scope.login.message=res.error;
                console.log(res.error);
            }
        },function(err){
            console.log(err);
            console.log(err.data.status);
            console.log(err.data.error);
            $scope.login.error=true;
            $scope.login.message=err.data.error;
        });
    };
    
    
    /**
     * Trigger after click the logout button
     * If logout success, reload the page
     */ 
    $scope.logout= function(){
        myAjax.get(
                    {directive:'user', branch:'logout', sessionId: $scope.user.sessionId}
                    )
        .$promise
        .then(function(res){
            if(res.status=='success')
            {
                console.log("logout success");
                location.reload();
            }
            else
            {
                console.log("logout fail");
            }
        },function(err){
            console.log(err);
            console.log(err.data.status);
            console.log(err.data.error);
        });
    };
    
    
    /**
     * get all videos
     * save server return data[] to $scope.videos, meanwhile, add
     * $scope.videos.rateStar attribute to every video, which used by ng-repeat from
     * the DOM
     */ 
    $scope.getVideos= function(skip,limit){
        myAjax.get(
                    {directive:'videos', sessionId: $scope.user.sessionId, skip:skip, limit:limit } //skip:1, limit:1
                    )
        .$promise
        .then(function(res){
            if(res.status=='success')
            {
                /* 
                add rateStar:[] attribute to every vido object, 
                the length of the rateStar:[] will be the average rating of the video
                */
                res.data.map(function(v){ 
                    var rateSum = v.ratings.reduce(function(x,y){return x+y});
                    var rateAvg = rateSum / v.ratings.length;
                    v.rateStar=new Array(Math.round(rateAvg));
                    return v;
                });
                
                $scope.videos=res.data;
                console.log("Get videos success");
                
            }
            else
            {
                console.log("Get videos fail");
            }
        },function(err){
            console.log(err);
        });
    };

}]);