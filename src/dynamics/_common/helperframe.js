Scoped.define("module:Common.Dynamics.Helperframe", [
    "dynamics:Dynamic",
    "base:Async",
    "base:Timers.Timer",
    "base:Objs",
    "browser:Events",
    "browser:Geometry",
    "browser:Info"
], function(Class, Async, Timer, Objs, DomEvents, Geometry, Info, scoped) {
    return Class.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            attrs: {
                "css": "ba-videorecorder",
                "framereversable": true,
                "framedragable": true,
                "frameresizeable": false,
                "framepositionx": 5,
                "framepositiony": 5,
                "frameminwidth": 120,
                "frameminheight": 95,
                "initialpositionx": null,
                "initialpositiony": null,
                "initialwidth": null,
                "initialheight": null,
                "flipframe": false,
                "frameproportional": true,
                "framemainstyle": {
                    opacity: 0.5,
                    position: 'absolute',
                    cursor: 'pointer',
                    zIndex: 100
                }
            },

            types: {
                "framereversable": "boolean",
                "framedragable": "boolean",
                "frameresizeable": "boolean",
                "frameproportional": "boolean",
                "framepositionx": "int",
                "framepositiony": "int",
                "frameminwidth": "int",
                "frameminheight": "int"
            },

            computed: {},

            events: {
                "change:framepositionx change:framepositiony change:framewidth change:frameheight": function(value) {
                    if (typeof this.recorder !== 'undefined') {
                        if (typeof this.recorder._recorder === 'object' && this.__visibleDimensions.accessible) {
                            this.recorder._recorder.updateMultiStreamPosition(
                                this.get("framepositionx"),
                                this.get("framepositiony"),
                                this.get("framewidth"),
                                this.get("frameheight")
                            );
                        } else {
                            // If previous recorder instance will be destroyed (like after rerecord)
                            this.recorder = this.__parent.recorder;
                        }
                    }
                }
            },

            create: function() {
                var _interactionEvent;
                var _frameClicksCount = 0;
                this.__parent = this.parent();
                this.__initialSettings = {
                    reversable: this.get("framereversable"),
                    dragable: this.get("framedragable"),
                    resizeable: this.get("frameresizeable")
                };

                Objs.iter(this.get("framemainstyle"), function(value, index) {
                    this.activeElement().style[index] = value;
                }, this);

                if (!this.get("initialpositionx") || !this.get("initialpositiony")) {
                    this.set("initialpositionx", this.get("framepositionx"));
                    this.set("initialpositiony", this.get("framepositiony"));
                }

                // Create additional related elements after reverse element created
                _interactionEvent = (Info.isTouchable() && !Info.isDesktop()) ? 'touch' : 'click';

                this._frameInteractionEventHandler = this.auto_destroy(new DomEvents());

                this.recorder = this.__parent.recorder;
                this.player = this.__parent.player;
                this.__visibleDimensions = {};
                this.__setHelperFrameDimensions();

                // fit frame dimensions based on source resolution
                // Only after we have _recorder informer
                if (!this.__visibleDimensions.accessible) {
                    var timer = new Timer({
                        context: this,
                        fire: function() {
                            if (this.recorder._recorder._videoTrackSettings && typeof this.recorder._recorder._videoTrackSettings.videoElement === 'object' && timer) {
                                this.set("framewidth", this.__parent.get("addstreampositionwidth"));
                                this.set("frameheight", this.__parent.get("addstreampositionheight"));
                                if (!this.get("initialwidth") || !this.get("initialheight")) {
                                    this.set("initialwidth", this.get("framewidth"));
                                    this.set("initialheight", this.get("frameheight"));
                                }
                                this.fitFrameViewOnScreenVideo();
                                timer.stop();
                            }
                        },
                        delay: 10,
                        destroy_on_stop: true,
                        immediate: true
                    });
                }

                if (this.recorder) {
                    // DO RECORDER STUFF
                    this.recorder._recorder.on("multistream-camera-switched", function(dimensions, isReversed) {
                        if (this.__initialSettings.resizeable && this.__resizerElement) {
                            this.set("frameresizeable", isReversed);
                            this.__resizerElement.style.display = isReversed ? 'none' : 'block';
                        }
                        this.set("framewidth", dimensions.width);
                        this.set("frameheight", dimensions.height);
                    }, this);

                    // If Reverse Cameras Settings is true
                    if (this.get("framereversable")) {
                        this._frameInteractionEventHandler.on(this.activeElement(), _interactionEvent, function(ev) {
                            _frameClicksCount++;
                            // because not enough info regarding supported versions also not be able to support mobile, avoided to use dblclick event
                            if (_frameClicksCount === 1)
                                Async.eventually(function() {
                                    _frameClicksCount = 0;
                                }, this, 400);

                            if (_frameClicksCount >= 2) {
                                this.recorder.reverseCameraScreens();
                            }
                        }, this);
                    }

                    // If Drag Settings is true
                    if (this.get("framedragable"))
                        this.addDragOption(this.__parent.activeElement());

                    if (this.get("frameresizeable")) {
                        this.addResize((Info.isTouchable() && !Info.isDesktop()), null, {
                            width: '7px',
                            height: '7px',
                            borderRight: '1px solid white',
                            borderBottom: '1px solid white',
                            bottom: 0,
                            right: 0,
                            position: 'absolute',
                            cursor: 'nwse-resize',
                            zIndex: 200
                        });
                    }
                } else if (this.player) {
                    // DO PLAYER STUFF
                }
            },

            functions: {},

            /**
             * Will calculate real
             * @private
             */
            fitFrameViewOnScreenVideo: function() {

                // It will be accessible when at least one of the
                // EventListeners will be fired
                var vts = this.recorder._recorder._videoTrackSettings;
                if (!vts)
                    return;
                var _height = this.__parent.get('height') ? vts.videoElement.height : vts.videoInnerFrame.height;

                if (!this.__vts) this.__vts = vts;

                this.__translate = Geometry.padFitBoxInBox(vts.width, vts.height, vts.videoElement.width, _height);

                if (!this.__resizing) {
                    this.__visibleDimensions.x = this.__translate.offsetX + this.get("framepositionx") * this.__translate.scale;
                    this.__visibleDimensions.y = this.__translate.offsetY + this.get("framepositiony") * this.__translate.scale;
                }

                this.__visibleDimensions.width = this.get("framewidth") * this.__translate.scale;
                this.__visibleDimensions.height = this.get("frameheight") * this.__translate.scale;

                this.__visibleDimensions.accessible = true;

                if (!this.__dragging && !this.__resizing) {
                    this.__positions = {
                        initialX: this.__visibleDimensions.x,
                        initialY: this.__visibleDimensions.y,
                        currentX: this.__visibleDimensions.x,
                        currentY: this.__visibleDimensions.y,
                        bottomX: this.__visibleDimensions.x + this.__visibleDimensions.width,
                        bottomY: this.__visibleDimensions.y + this.__visibleDimensions.height,
                        xOffset: 0,
                        yOffset: 0
                    };
                }

                this.__setHelperFrameDimensions();
            },

            /**
             * Will add Drag
             *
             * @param {HTMLElement} container
             * @private
             */
            addDragOption: function(container) {
                this._draggingEvent = this.auto_destroy(new DomEvents());

                var isTouchable = Info.isTouchable() && !Info.isDesktop();
                // switch to touch events if using a touch screen
                var _endEvent = isTouchable ? 'touchend' : 'mouseup';
                var _moveEvent = isTouchable ? 'touchmove' : 'mousemove';
                var _startEvent = isTouchable ? 'touchstart' : 'mousedown';

                this._draggingEvent.on(container, _endEvent, this.__handleMouseEndEvent, this);
                this._draggingEvent.on(container, _moveEvent, this.__handleMouseMoveEvent, this);
                this._draggingEvent.on(container, _startEvent, this.__handleMouseStartEvent, this);
            },

            /**
             * @param {Boolean} isTouchDevice
             * @param {HTMLElement} container
             * @param {Object} options
             * @private
             */
            addResize: function(isTouchDevice, container, options) {
                container = container || this.activeElement();

                this.__resizerElement = document.createElement('div');

                Objs.iter(options, function(value, index) {
                    this.__resizerElement.style[index] = value;
                }, this);

                container.append(this.__resizerElement);
                this.__resizeEvent = this.auto_destroy(new DomEvents());
            },

            /**
             * Handle Draggable Element Mouse Event
             *
             * @param {MouseEvent|TouchEvent} ev
             * @private
             */
            __handleMouseStartEvent: function(ev) {
                ev.preventDefault();
                if (typeof this.__visibleDimensions.accessible === 'undefined') {
                    this.fitFrameViewOnScreenVideo();
                    return;
                }
                this.__dragging = ev.target === this.activeElement();
                this.__resizing = ev.target === this.__resizerElement;

                if (typeof this.__positions === 'object') {
                    if (ev.type === "touchstart") {
                        this.__positions.initialX = ev.touches[0].clientX - this.__positions.xOffset;
                        this.__positions.initialY = ev.touches[0].clientY - this.__positions.yOffset;
                    } else {
                        if (this.__dragging) {
                            this.__positions.initialX = ev.clientX - this.__positions.xOffset;
                            this.__positions.initialY = ev.clientY - this.__positions.yOffset;
                        }
                        this.__positions.bottomX = this.__positions.initialX + this.__visibleDimensions.width;
                        this.__positions.bottomY = this.__positions.initialY + this.__visibleDimensions.height;
                    }
                }
            },


            /**
             * Listener of mouse movement
             *
             * @param {MouseEvent|TouchEvent} ev
             * @private
             */
            __handleMouseMoveEvent: function(ev) {
                var setTranslate = function(el, posX, posY) {
                    el.style.transform = "translate3d(" + posX + "px, " + posY + "px, 0)";
                };

                var setDimension = function(el, width, height) {
                    el.style.width = width;
                    el.style.height = height;
                };

                ev.preventDefault();
                if (!this.__dragging && !this.__resizing) return;
                this.activeElement().style.cursor = 'move';
                this.activeElement().style.opacity = '0';

                var _diffX, _diffY;

                if (ev.type === "touchmove") {
                    this.__positions.currentX = ev.touches[0].clientX - this.__positions.initialX;
                    this.__positions.currentY = ev.touches[0].clientY - this.__positions.initialY;
                } else {
                    if (this.__dragging) {
                        this.__positions.currentX = ev.clientX - this.__positions.initialX;
                        this.__positions.currentY = ev.clientY - this.__positions.initialY;
                    }

                    if (this.__resizing) {
                        // var _d = this.activeElement().getBoundingClientRect();
                        // this.__visibleDimensions.width = this.get("framewidth") * this.__translate.scale;
                        // this.__visibleDimensions.height = this.get("frameheight") * this.__translate.scale;
                        _diffX = ev.clientX - this.__positions.bottomX; //(this.__positions.currentX + this.__visibleDimensions.width);
                        _diffY = ev.clientY - this.__positions.bottomY; //(this.__positions.currentY + this.__visibleDimensions.height);
                    }
                }


                if (this.__dragging) {
                    this.__positions.xOffset = this.__positions.currentX;
                    this.__positions.yOffset = this.__positions.currentY;

                    setTranslate(this.activeElement(), this.__positions.currentX, this.__positions.currentY);
                    this.set("framepositionx", this.__positions.currentX / this.__translate.scale + this.get("initialpositionx"));
                    this.set("framepositiony", this.__positions.currentY / this.__translate.scale + this.get("initialpositiony"));
                }

                if (this.__resizing) {
                    var _height;
                    var _width = this.__visibleDimensions.width + _diffX;
                    if (this.get("frameproportional"))
                        _height = _width / this.__vts.aspectRatio;
                    else
                        _height = this.__visibleDimensions.height + _diffY;

                    this.__positions.bottomX = this.__positions.currentX + _width;
                    this.__positions.bottomY = this.__positions.currentY + _height;

                    this.set("framewidth", _width / this.__translate.scale);
                    this.set("frameheight", _height / this.__translate.scale);

                    this.fitFrameViewOnScreenVideo();
                    setDimension(this.activeElement(), _width, _height);
                }

            },

            /**
             * Listener of movement end
             *
             * @param {MouseEvent|TouchEvent} ev
             * @private
             */
            __handleMouseEndEvent: function(ev) {
                ev.preventDefault();
                if (!this.__dragging && !this.__resizing) return;

                if (!this.__resizing) {
                    this.__positions.initialX = this.__positions.currentX;
                    this.__positions.initialY = this.__positions.currentY;
                } else {
                    this.__positions.bottomX = this.__positions.currentX + this.__visibleDimensions.width;
                    this.__positions.bottomY = this.__positions.currentY + this.__visibleDimensions.height;
                }

                this.activeElement().style.cursor = 'pointer';
                this.activeElement().style.opacity = this.get("framemainstyle").opacity;

                this.__dragging = false;
                this.__resizing = false;
            },

            /**
             * Helper method will set dimensions for multi-screen recorder related elements
             *
             * @param {HTMLElement=} element - HTML element or Null to set dimentions and position
             * @private
             */
            __setHelperFrameDimensions: function(element) {
                element = element || this.activeElement();
                if (element) {
                    element.style.top = this.__visibleDimensions.y + 'px';
                    element.style.left = this.__visibleDimensions.x + 'px';
                    element.style.width = this.__visibleDimensions.width + 'px';
                    element.style.height = this.__visibleDimensions.height + 'px';
                }
            }
        };
    }).register("ba-helperframe");
});