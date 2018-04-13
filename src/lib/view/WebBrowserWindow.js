"use strict"

window.WebBrowserWindow = ideal.Proto.extend().newSlots({
    type: "WebBrowserWindow",
    //win: null,
    documentBody: DocumentBody.clone(),
}).setSlots({
    init: function () {
        throw new Error("this class is meant to be used as singleton, for now")
        return this
    },
    
    shared: function() {
        return this
    },

	setup: function() {
		this.preventDrop()
	},
    
 /*  
    win: function() {
        if (!this._win) {
            const remote = require('electron').remote;
            this._win = remote.getCurrentWindow()
        }
        return this._win
    },
*/

	// prevent window level drop and only allow drop on elements that can handle it

	dropCheck : function(e) {
		// stopEventIfNotDroppable
		
		if (e.target.ondrop == null) {
			e.preventDefault();
			e.dataTransfer.effectAllowed = "none";
			e.dataTransfer.dropEffect = "none";	
		}
		
		return this
	},

	preventDrop: function() {
		window.addEventListener("dragenter", (e) => { this.dropCheck(e) }, false);
		window.addEventListener("dragover",  (e) => { this.dropCheck(e) }, false);
		window.addEventListener("drop",      (e) => { this.dropCheck(e) }, false);
		return this
	},
	
	// attributes
    
    width: function () {
        return window.innerWidth
    },

    height: function () {
        return window.innerHeight
    },
    
    aspectRatio: function() {
        return this.width() / this.height()
    },
    
    setWidth: function (w) {
        console.warn("warning: WebBrowserWindow.setWidth() unavailable in browser")
		return this
    },
    
    setHeight: function (h) {
        console.warn("warning: WebBrowserWindow.setHeight() unavailable in browser")
		return this
    },
    
    show: function() {
        console.log("Window size " + this.width() + "x" + this.height())
    },

    /*
    isOnPhone: function()
    {
       var userAgent = navigator.userAgent.toLowerCase()
       console.log("userAgent: '" + userAgent + "'")
    },
    */
    
    mobileNames: function() {
        return ["android", "webos", "iphone", "ipad", "ipod", "blackBerry", "windows phone"]  
    },

    agent: function() {
        var agent = navigator.userAgent.toLowerCase()
        return agent
    },
    
    isOnMobile: function() { 
        var agent = this.agent();
        var match = this.mobileNames().detect((name) => { return agent.contains(name); })
        return !(match === null)
    },

	isTouchDevice: function() {
		// via https://stackoverflow.com/questions/4817029/whats-the-best-way-to-detect-a-touch-screen-device-using-javascript
		var result = 'ontouchstart' in window        // works on most browsers 
			|| navigator.maxTouchPoints;       // works on IE10/11 and Surface	
		if (result === 0) { result = false; }		
		//console.log("WebBrowserWindow.isTouchDevice() = ", result)
		return result
	},

    urlHash: function() {
        return decodeURI(window.location.hash.substr(1)) // return string after # character
    },
    
    setUrlHash: function(aString) {
        if (this.urlHash() != aString) {
            window.location.hash = encodeURI(aString)
        }
        return this
    },
    
    descriptionDict: function() {
        var dict = {
            agent: this.agent(),
            size: this.width() + "x" + this.height(),
            isOnMobile: this.isOnMobile()
        }
        return dict
    },

	urlHostname: function() {
		var parser = document.createElement('a')
		parser.href = window.location.href
		return parser.hostname
	},
	
	setTitle: function(aName) {
		document.title = aName
        return this
	},
})


WebBrowserWindow.setup()
