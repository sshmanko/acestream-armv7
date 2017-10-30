/**
 * DHTMLGoodies.com - Seekbar
 * Author: Alf Magne Kalleland, DHTMLGoodies.com, July 2015
 * License:: https://www.apache.org/licenses/LICENSE-2.0
 */
if(!Seekbar)var Seekbar = {};

Seekbar.Seekbar = function(config){
    config = config || {};

    var props = ["minValue","maxValue","value", "valueListener","hoverListener","negativeColor","positiveColor","needleSize","barSize"];
    for(var i=0;i<props.length;i++){
        var key = props[i];
        if(config[key] != undefined)this[key] = config[key];
    }


    if(config.renderTo != undefined)this.renderTo = $(config.renderTo);

    if(config.thumbColor != undefined){
        if(config.thumbColor.length == 9){
            var alpha = config.thumbColor.substr(1,2);
            this.thumbAlpha = parseInt(alpha,16) / 255;
            config.thumbColor = "#" + config.thumbColor.substr(3);
        }
        this.thumbColor = config.thumbColor;
    }

    if(this.value < this.minValue)this.value = this.minValue;
    if(this.value > this.maxValue)this.value = this.maxValue;

    this.area = { width: 0, height: 0, max:0 };
    this.valueArea = { min: 0, max: 0, width:0 };
    this.render();
};

$.extend(Seekbar.Seekbar.prototype, {
    thumbAlpha : 1,
    renderTo:undefined,
    negativeColor : '#006699',
    positiveColor : '#ccc',
    thumbColor : '#006699',

    minValue : 0,
    maxValue : 10,
    value: 0,

    barSize: 2,

    el : undefined,
    elNegative : undefined,
    elPositive: undefined,

    thumb:undefined,
    thumbInner:undefined,
    thumbOuter:undefined,
    needleSize: 0.2,

    area : undefined,
    valueArea: undefined,

    orientation : undefined,
    thumbSize : 0,
    isDragging : false,
    isHovering: false,

    startCoordinates:undefined,

    valueListener:undefined,
    hoverListener:undefined,
    disabled: false,

    render:function(){
        this.el = $('<div class="dhtmlgoodies-seekbar" style="position:relative;width:100%;height:100%"></div>');

        this.renderTo.append(this.el);

        this.updateSize();

        this.elNegative = $('<div class="seekbar-negative" style="position:absolute;z-index:1"></div>');
        this.elPositive = $('<div class="seekbar-positive" style="position:absolute;z-index:1"></div>');

        if(this.negativeColor != undefined){
            this.elNegative.css("background-color", this.negativeColor);
        }
        if(this.positiveColor != undefined){
            this.elPositive.css("background-color", this.positiveColor);
        }


        this.thumb = $('<div style="position:absolute;z-index:2"></div>');
        this.thumbInner = $('<div class="seekbar-thumb-needle" style="position:absolute;z-index:2;background-color:' + this.thumbColor + '"></div>');
        this.thumbOuter = $('<div class="seekbar-thumb" style="position:absolute;z-index:2;width:100%;height:100%;background-color:' + this.thumbColor + '"></div>');

        if(this.thumbColor != undefined){
            this.thumbInner.css("background-color", this.thumbColor);
            this.thumbOuter.css("background-color", this.thumbColor);

        }

        this.updateAlpha();

        this.thumb.append(this.thumbInner);
        this.thumb.append(this.thumbOuter);


        this.el.append(this.elNegative);
        this.el.append(this.elPositive);
        this.el.append(this.thumb);


        this.thumb.on("mousedown", this.startDragging.bind(this));
        this.thumb.on("touchstart", this.startDragging.bind(this));

        this.el.on("click", this.click.bind(this));
        this.el.on("mouseenter", this.startHover.bind(this));
        this.el.on("mousemove", this.hover.bind(this));
        this.el.on("mouseleave", this.endHover.bind(this));

        $(document.documentElement).on("touchmove", this.drag.bind(this));
        $(document.documentElement).on("mousemove", this.drag.bind(this));
        $(document.documentElement).on("mouseup", this.endDrag.bind(this));
        $(document.documentElement).on("touchend", this.endDrag.bind(this));

        this.positionItems();

    },

    updateSize: function() {
        this.area.width = this.el.width();
        this.area.height = this.el.height();
        this.area.size = Math.max(this.area.width, this.area.height);
        this.orientation = this.area.width >= this.area.height ? 'horizontal' : 'vertical';
    },

    update: function() {
        this.updateSize();
        this.positionItems();
        this.positionThumb();
    },

    setValue:function(value){
        this.value = Math.max(this.minValue, value);
        this.value = Math.min(this.maxValue, this.value);

        this.positionBars();
        this.positionThumb();
    },

    setMax:function(value){
        this.maxValue = value;

        this.positionBars();
        this.positionThumb();
    },

    positionItems:function(){
        this.thumbSize = Math.min(this.area.height, this.area.width);
        var size = Math.max(this.area.width, this.area.height);

        this.thumbOuter.css({
           'width' : this.thumbSize, 'height' : this.thumbSize, 'border-radius' : this.thumbSize / 2
        });
        this.thumb.css({
           'width' : this.thumbSize, 'height' : this.thumbSize, 'border-radius' : this.thumbSize / 2
        });

        var needleSize = Math.round(this.thumbSize * this.needleSize);
        needleSize += needleSize % 2;
        var pos = (this.thumbSize / 2) - (needleSize / 2);

        this.thumbInner.css({
            width: needleSize, height: needleSize, borderRadius: needleSize / 2, left: pos, top:pos
        });


        this.valueArea.min = this.thumbSize / 2;
        this.valueArea.max = size - this.thumbSize / 2;
        this.valueArea.size = this.valueArea.max - this.valueArea.min;

        var barPos = (this.thumbSize / 2) - (this.barSize / 2);
        if(this.orientation == 'horizontal'){

            this.elNegative.css({
                "left" : this.valueArea.min, top: barPos, height: this.barSize
            });
            this.elPositive.css({
                "left" : this.valueArea.min, top: barPos, height: this.barSize
            });
        }else{

            this.elNegative.css({
                "top": 0, width: this.barSize, left: barPos
            });

            this.elPositive.css({
                "top": this.valueArea.min, width: this.barSize, left: barPos
            });
        }
        var br = Math.floor(this.barSize / 2) + this.barSize % 2;

        this.elNegative.css("border-radius", br);
        this.elPositive.css("border-radius", br);

        this.positionBars();
        this.positionThumb();

    },


    positionThumb:function(){
        var pos = this.getValuePos();
        if(this.orientation == 'horizontal'){
            this.thumb.css("left", pos);
        }else{
            this.thumb.css("top", pos);
        }
    },

    positionBars:function(){
        var pos = this.getValuePos();

        if(this.orientation == 'horizontal'){
            this.elNegative.css("width", pos);
            this.elPositive.css({ "left" : pos + this.valueArea.min, "width": this.valueArea.size - pos});

        }else{
            this.elPositive.css("height", pos);
            this.elNegative.css({
                top:pos + this.valueArea.min,
                height: this.valueArea.size - pos
            });
        }

    },

    getValuePos:function(){
        if(this.orientation == 'horizontal'){
            return (this.valueArea.size * (this.value - this.minValue) / (this.maxValue - this.minValue));
        }else{
            return this.valueArea.max - (this.valueArea.min + (this.valueArea.size * (this.value - this.minValue) / (this.maxValue - this.minValue)));
        }
    },

    startDragging:function(e){
        if(this.disabled) {
            return;
        }
        this.thumbOuter.css("opacity", "");
        this.thumbOuter.addClass("seekbar-thumb-over");
        this.isDragging = true;

        var position = this.thumb.position();

        var x = e.pageX;
        var y = e.pageY;

        if(e.type && e.type == "touchstart"){
            x = e.originalEvent.touches[0].pageX;
            y = e.originalEvent.touches[0].pageY;
        }

        this.startCoordinates = { x : x, y: y, elX : position.left, elY: position.top };

        return false;
    },

    drag:function(e){
        if(!this.isDragging)return;

        var x = e.pageX;
        var y = e.pageY;

        if(e.type && e.type == "touchmove"){
            x = e.originalEvent.touches[0].pageX;
            y = e.originalEvent.touches[0].pageY;
        }

        var pos = 0;
        if(this.orientation == 'horizontal') {
            pos = this.startCoordinates.elX + x - this.startCoordinates.x;

        }else{
            pos = this.startCoordinates.elY + y - this.startCoordinates.y;
        }


        if (pos < 0)pos = 0;
        if (pos > this.area.size - this.thumbSize)pos = this.area.size - this.thumbSize;

        this.value = this.minValue + (pos / this.valueArea.size * (this.maxValue-this.minValue));

        if(this.orientation == 'vertical'){
            this.value = this.maxValue - this.value;
        }

        if (this.valueListener != undefined) {
            this.valueListener.call(this, this.value, false);
        }

        this.positionBars();

        if(this.orientation == 'horizontal'){

            this.thumb.css("left", this.getValuePos());
        }else{
            this.thumb.css("top", this.getValuePos());
        }

        return false;
    },

    updateAlpha:function(){
        if(this.thumbAlpha < 1){
            this.thumbOuter.css("opacity", this.thumbAlpha);
        }
    },

    endDrag:function(){
        if(!this.isDragging)return;

        this.updateAlpha();

        this.thumbOuter.removeClass("seekbar-thumb-over");

        if (this.valueListener != undefined) {
            this.valueListener.call(this, this.value, true);
        }

        this.isDragging = false;
    },

    click:function(e) {
        if(this.disabled) {
            return;
        }
        if(e.target && $(e.target).hasClass("seekbar-thumb")) {
            return;
        }
        var x = e.pageX;
        var y = e.pageY;
        var offset = this.el.offset();
        var pos = 0;

        if(this.orientation == 'horizontal') {
            pos = x - offset.left;
        }
        else {
            pos = y - offset.top;
        }


        if(pos < 0) {
            pos = 0;
        }
        if (pos > this.area.size - this.thumbSize) {
            pos = this.area.size - this.thumbSize;
        }

        this.value = this.minValue + (pos / this.valueArea.size * (this.maxValue-this.minValue));
        this.positionBars();
        this.positionThumb();

        if (this.valueListener != undefined) {
            this.valueListener.call(this, this.value, true);
        }
    },

    startHover: function(e) {
        if(this.disabled) {
            return;
        }
        this.isHovering = true;
    },

    endHover: function(e) {
        if(this.disabled) {
            return;
        }
        this.isHovering = false;
        if (this.hoverListener != undefined) {
            this.hoverListener.call(this, null);
        }
    },

    hover:function(e) {
        if(this.disabled) {
            return;
        }
        if(!this.isHovering) {
            return;
        }
        var x = e.pageX;
        var y = e.pageY;

        var offset = this.el.offset();
        var pos = 0;

        if(this.orientation == 'horizontal') {
            pos = x - offset.left;
        }
        else {
            pos = y - offset.top;
        }


        if(pos < 0) {
            pos = 0;
        }
        if (pos > this.area.size - this.thumbSize) {
            pos = this.area.size - this.thumbSize;
        }

        var value = this.minValue + (pos / this.valueArea.size * (this.maxValue-this.minValue));
        if (this.hoverListener != undefined) {
            this.hoverListener.call(this, value);
        }
    }


});