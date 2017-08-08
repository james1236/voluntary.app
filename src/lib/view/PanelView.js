

PanelView = DivView.extend().newSlots({
    type: "PanelView",
	titleView: null,
	subtitleView: null,
}).setSlots({
    init: function () {
		this.setTitleView(DivView.clone().setDivClassName("PanelTitleView"))
		this.setSbttleView(DivView.clone().setDivClassName("PanelSubtitleView"))

        return this
    },


})