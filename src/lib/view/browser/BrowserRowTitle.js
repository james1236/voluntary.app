"use strict"

window.BrowserRowTitle = TextField.extend().newSlots({
    type: "BrowserRowTitle",
}).setSlots({
    init: function () {
        TextField.init.apply(this)
        //this.setMinAndMaxHeight(17)
        return this
    },
})
