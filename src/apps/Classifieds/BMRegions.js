
BMRegions = BMRegion.extend().newSlots({
    type: "BMRegions",
}).setSlots({
    init: function () {
        BMRegion.init.apply(this)
        //this.setPid("_market")
        //this.setActions(["add"])
        //this.setSubnodeProto(BMPost)
        
        /*
        this.setDigital(BMStorableNode.clone().setTitle("Digital"))
        this.justAddItem(this.digital())
        
        this.setPhysical(BMStorableNode.clone().setTitle("Physical"))
        this.justAddItem(this.physical())
        */

        //console.log("begin BMClassifieds init")
        this.setNodeDict(RegionCountriesDict)
        this.setTitle("Regions")
        
        this.onLeavesAddDictChildren(CategoriesDict)
    },
    
    /*
    receivedMsgFrom: function(msg, remotePeer) {
        var postDict = JSON.parse(msg)
        var post = BMPost.clone().setPostDict(postDict)
        this.addItem(post)
        this.didUpdate() 
    }
    */
})
