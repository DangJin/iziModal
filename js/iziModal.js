/*
* iziModal | v1.5.0
* http://izimodal.marcelodolce.com
* by Marcelo Dolce.
*/

(function (factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node/CommonJS
        module.exports = function( root, jQuery ) {
            if ( jQuery === undefined ) {
                if ( typeof window !== 'undefined' ) {
                    jQuery = require('jquery');
                }
                else {
                    jQuery = require('jquery')(root);
                }
            }
            factory(jQuery);
            return jQuery;
        };
    } else {
        // Browser globals
        factory(jQuery);
    }
}(function ($) {

		var $window = $(window),
	    	$document = $(document),
			PLUGIN_NAME = 'iziModal',
			STATES = {
			CLOSING: 'closing',
			CLOSED: 'closed',
			OPENING: 'opening',
			OPENED: 'opened',
			DESTROYED: 'destroyed'
		};

		function whichAnimationEvent(){
			var t,
				el = document.createElement("fakeelement"),
				animations = {
				"animation"      : "animationend",
				"OAnimation"     : "oAnimationEnd",
				"MozAnimation"   : "animationend",
				"WebkitAnimation": "webkitAnimationEnd"
			};
			for (t in animations){
				if (el.style[t] !== undefined){
					return animations[t];
				}
			}
		}

		function isIE(userAgent) {
			userAgent = userAgent || navigator.userAgent;
			return userAgent.indexOf("MSIE ") > -1 || userAgent.indexOf("Trident/") > -1;
		}

		function clearValue(value){
			var separators = /%|px|em|cm|vh|vw/;
			return parseInt(String(value).split(separators)[0]);
		}

		var animationEvent = whichAnimationEvent(),
			isMobile = (/Mobi/.test(navigator.userAgent)) ? true : false,
			autoOpenModal = 0;

		var iziModal = function (element, options) {
			this.init(element, options);
		};

		iziModal.prototype = {

			constructor: iziModal,

			init: function (element, options) {

				var that = this;
				this.$element = $(element);

				if(this.$element.attr('id') !== undefined && this.$element.attr('id') !== ''){
					this.id = this.$element.attr('id');	
				} else {
					this.id = PLUGIN_NAME+Math.floor((Math.random() * 10000000) + 1);
					this.$element.attr('id', this.id);
				}
				this.classes = ( this.$element.attr('class') !== undefined ) ? this.$element.attr('class') : '';
				this.content = this.$element.html();
				this.state = STATES.CLOSED;
				this.options = options;
				this.width = 0;
				this.timer = null;
				this.timerTimeout = null;
				this.progressBar = null;
	            this.isPaused = false;
				this.isFullscreen = false;
	            this.headerHeight = 0;
	            this.modalHeight = 0;
	            this.$overlay = $('<div class="'+PLUGIN_NAME+'-overlay" style="background-color:'+options.overlayColor+'"></div>');
				this.$navigate = $('<div class="'+PLUGIN_NAME+'-navigate"><div class="'+PLUGIN_NAME+'-navigate-caption">Use</div><button class="'+PLUGIN_NAME+'-navigate-prev"></button><button class="'+PLUGIN_NAME+'-navigate-next"></button></div>');
	            this.group = {
	            	name: this.$element.attr('data-'+PLUGIN_NAME+'-group'),
	            	index: null,
	            	ids: []
	            };
				this.$element.attr('aria-hidden', 'true');
				this.$element.attr('aria-labelledby', this.id);
				this.$element.attr('role', 'dialog');

				if( !this.$element.hasClass('iziModal') ){
					this.$element.addClass('iziModal');
				}

	            if(this.group.name === undefined && options.group !== ""){
	            	this.group.name = options.group;
	            	this.$element.attr('data-'+PLUGIN_NAME+'-group', options.group);
	            }
	            if(this.options.loop === true){
	            	this.$element.attr('data-'+PLUGIN_NAME+'-loop', true);
	            }

	            $.each( this.options , function(index, val) {
					var attr = that.$element.attr('data-'+PLUGIN_NAME+'-'+index);
	            	try {
			            if(typeof attr !== typeof undefined){

							if(attr === "" || attr == "true"){
								options[index] = true;
							} else if (attr == "false") {
								options[index] = false;
							} else if (typeof val == 'function') {
								options[index] = new Function(attr);
							} else {
								options[index] = attr;
							}
			            }
	            	} catch(exc){}
	            });

	            if(options.appendTo !== false){
					this.$element.appendTo(options.appendTo);            	
	            }

				this.$header = $('<div class="'+PLUGIN_NAME+'-header"><h2 class="'+PLUGIN_NAME+'-header-title">' + options.title + '</h2><p class="'+PLUGIN_NAME+'-header-subtitle">' + options.subtitle + '</p><div class="'+PLUGIN_NAME+'-header-buttons"></div></div>');

				if (options.closeButton === true) {
					this.$header.find('.'+PLUGIN_NAME+'-header-buttons').append('<a href="javascript:void(0)" class="'+PLUGIN_NAME+'-button '+PLUGIN_NAME+'-button-close" data-'+PLUGIN_NAME+'-close></a>');
				}
	            
	            if (options.fullscreen === true) {
	            	this.$header.find('.'+PLUGIN_NAME+'-header-buttons').append('<a href="javascript:void(0)" class="'+PLUGIN_NAME+'-button '+PLUGIN_NAME+'-button-fullscreen" data-'+PLUGIN_NAME+'-fullscreen></a>');
	            }

				if (options.timeoutProgressbar === true && !isNaN(parseInt(options.timeout)) && options.timeout !== false && options.timeout !== 0) {
					this.$header.prepend('<div class="'+PLUGIN_NAME+'-progressbar"><div style="background-color:'+options.timeoutProgressbarColor+'"></div></div>');
	            }

	            if (options.iframe === true) {
	                this.$element.html('<div class="'+PLUGIN_NAME+'-wrap"><div class="'+PLUGIN_NAME+'-content"><iframe class="'+PLUGIN_NAME+'-iframe"></iframe>' + this.content + "</div></div>");
	                
		            if (options.iframeHeight !== null) {
		                this.$element.find('.'+PLUGIN_NAME+'-iframe').css('height', options.iframeHeight);
		            }
	            } else {
	            	this.$element.html('<div class="'+PLUGIN_NAME+'-wrap"><div class="'+PLUGIN_NAME+'-content">' + this.content + '</div></div>');
	            }
	            this.$wrap = this.$element.find('.'+PLUGIN_NAME+'-wrap');

	            if (options.subtitle === '') {
	        		this.$header.addClass(PLUGIN_NAME+'-noSubtitle');
	            }

	            if (options.title !== "" || options.subtitle !== "") {

	                if (options.headerColor !== null) {
	                    this.$element.css('border-bottom', '3px solid ' + options.headerColor + '');
	                    this.$header.css('background', this.options.headerColor);
	                }
					if (options.icon !== null || options.iconText !== null){

	                    this.$header.prepend('<i class="'+PLUGIN_NAME+'-header-icon"></i>');

		                if (options.icon !== null) {
		                    this.$header.find('.'+PLUGIN_NAME+'-header-icon').addClass(options.icon).css('color', options.iconColor);
						}
		                if (options.iconText !== null){
		                	this.$header.find('.'+PLUGIN_NAME+'-header-icon').html(options.iconText);
		                }
					}
	                this.$element.css('overflow', 'hidden').prepend(this.$header);
	            }

				if(options.zindex !== null && !isNaN(parseInt(options.zindex)) ){
				 	this.$element.css('z-index', options.zindex);
				 	this.$navigate.css('z-index', options.zindex-1);
				 	this.$overlay.css('z-index', options.zindex-2);
				}

				if(options.radius !== ""){
	                this.$element.css('border-radius', options.radius);
	            }

	            if(options.padding !== ""){
	                this.$element.find('.'+PLUGIN_NAME+'-content').css('padding', options.padding);
	            }

	            if(options.theme !== ""){
					if(options.theme === "light"){
						this.$element.addClass(PLUGIN_NAME+'-light');
					} else {
						this.$element.addClass(options.theme);
					}
	            }

				if(options.rtl === true) {
					this.$element.addClass(PLUGIN_NAME+'-rtl');
				}

				if(options.openFullscreen === true){
				    this.isFullscreen = true;
				    this.$element.addClass('isFullscreen');
				}

				this.recalcWidth();
				this.recalcVerticalPos();
			},

			setGroup: function(groupName){

				var that = this,
					group = this.group.name || groupName;
					this.group.ids = [];

				if( groupName !== undefined && groupName !== this.group.name){
					group = groupName;
					this.group.name = group;
					this.$element.attr('data-'+PLUGIN_NAME+'-group', group);				
				}
				if(group !== undefined && group !== ""){

	            	var count = 0;
	            	$.each( $('.'+PLUGIN_NAME+'[data-'+PLUGIN_NAME+'-group='+group+']') , function(index, val) {

						that.group.ids.push($(this).attr('id'));

						if(that.id == $(this).attr('id')){
							that.group.index = count;
						}
	        			count++;
	            	});
	            }
			},

			toggle: function () {

				if(this.state == STATES.OPENED){
					this.close();
				}
				if(this.state == STATES.CLOSED){
					this.open();
				}

			},

			open: function (param) {

				var that = this;

				function opened(){
				    
				    // console.info('[ '+PLUGIN_NAME+' | '+that.id+' ] Opened.');

					that.state = STATES.OPENED;
			    	that.$element.trigger(STATES.OPENED);

					if (that.options.onOpened && typeof(that.options.onOpened) === "function") {
				        that.options.onOpened(that);
				    }
				}

				function bindEvents(){

		            // Close when button pressed
		            that.$element.off('click', '[data-'+PLUGIN_NAME+'-close]').on('click', '[data-'+PLUGIN_NAME+'-close]', function (e) {
		                e.preventDefault();

		                var transition = $(e.currentTarget).attr('data-'+PLUGIN_NAME+'-transitionOut');

		                if(transition !== undefined){
		                	that.close({transition:transition});
		                } else {
		                	that.close();
		                }
		            });

		            // Expand when button pressed
		            that.$element.off('click', '[data-'+PLUGIN_NAME+'-fullscreen]').on('click', '[data-'+PLUGIN_NAME+'-fullscreen]', function (e) {
		                e.preventDefault();
		                if(that.isFullscreen === true){
							that.isFullscreen = false;
			                that.$element.removeClass('isFullscreen');
		                } else {
			                that.isFullscreen = true;
			                that.$element.addClass('isFullscreen');
		                }
						if (that.options.onFullscreen && typeof(that.options.onFullscreen) === "function") {
					        that.options.onFullscreen(that);
					    }
					    that.$element.trigger('fullscreen', that);
		            });

		            // Next modal
		            that.$navigate.off('click', '.'+PLUGIN_NAME+'-navigate-next').on('click', '.'+PLUGIN_NAME+'-navigate-next', function (e) {
		            	that.next(e);
		            });
		            that.$element.off('click', '[data-'+PLUGIN_NAME+'-next]').on('click', '[data-'+PLUGIN_NAME+'-next]', function (e) {
		            	that.next(e);
		            });

		            // Previous modal
		            that.$navigate.off('click', '.'+PLUGIN_NAME+'-navigate-prev').on('click', '.'+PLUGIN_NAME+'-navigate-prev', function (e) {
		            	that.prev(e);
		            });
					that.$element.off('click', '[data-'+PLUGIN_NAME+'-prev]').on('click', '[data-'+PLUGIN_NAME+'-prev]', function (e) {
		            	that.prev(e);
		            });
				}

			    if(this.state == STATES.CLOSED){

			    	bindEvents();

					this.setGroup();
					this.state = STATES.OPENING;
		            this.$element.trigger(STATES.OPENING);
					this.$element.attr('aria-hidden', 'false');

					// console.info('[ '+PLUGIN_NAME+' | '+this.id+' ] Opening...');

					if(this.options.iframe === true){
						
						this.$element.find('.'+PLUGIN_NAME+'-content').addClass(PLUGIN_NAME+'-content-loader');

						this.$element.find('.'+PLUGIN_NAME+'-iframe').on('load', function(){
							$(this).parent().removeClass(PLUGIN_NAME+'-content-loader');
						});

						var href = null;
						try {
							href = $(param.currentTarget).attr('href') !== "" ? $(param.currentTarget).attr('href') : null;
						} catch(e) {
							// console.warn(e);
						}
						if( (this.options.iframeURL !== null) && (href === null || href === undefined)){
							href = this.options.iframeURL;
						}
						if(href === null || href === undefined){
							throw new Error("Failed to find iframe URL");
						}
					    this.$element.find('.'+PLUGIN_NAME+'-iframe').attr('src', href);
					}


					if (this.options.bodyOverflow || isMobile){
						$('html').addClass(PLUGIN_NAME+'-isOverflow');
						if(isMobile){
							$('body').css('overflow', 'hidden');
						}
					}

					if (this.options.onOpening && typeof(this.options.onOpening) === "function") {
				        this.options.onOpening(this);
				    }			    
					(function open(){

				    	if(that.group.ids.length > 1 ){

				    		that.$navigate.appendTo('body');
				    		that.$navigate.addClass(that.options.transitionInOverlay);

				    		if(that.options.navigateCaption === true){
				    			that.$navigate.find('.'+PLUGIN_NAME+'-navigate-caption').show();
				    		}

				    		var modalWidth = that.$element.outerWidth();
				    		if(that.options.navigateArrows !== false){
						    	if (that.options.navigateArrows === 'closeScreenEdge'){
					    			that.$navigate.find('.'+PLUGIN_NAME+'-navigate-prev').css('left', 0).show();
					    			that.$navigate.find('.'+PLUGIN_NAME+'-navigate-next').css('right', 0).show();
						    	} else {
							    	that.$navigate.find('.'+PLUGIN_NAME+'-navigate-prev').css('margin-left', -((modalWidth/2)+84)).show();
							    	that.$navigate.find('.'+PLUGIN_NAME+'-navigate-next').css('margin-right', -((modalWidth/2)+84)).show();					    		
						    	}
				    		} else {
				    			that.$navigate.find('.'+PLUGIN_NAME+'-navigate-prev').hide();
				    			that.$navigate.find('.'+PLUGIN_NAME+'-navigate-next').hide();
				    		}
				    		
				    		var loop;
							if(that.group.index === 0){

								loop = $('.'+PLUGIN_NAME+'[data-'+PLUGIN_NAME+'-group="'+that.group.name+'"][data-'+PLUGIN_NAME+'-loop]').length;

								if(loop === 0 && that.options.loop === false)
									that.$navigate.find('.'+PLUGIN_NAME+'-navigate-prev').hide();
					    	}
					    	if(that.group.index+1 === that.group.ids.length){

					    		loop = $('.'+PLUGIN_NAME+'[data-'+PLUGIN_NAME+'-group="'+that.group.name+'"][data-'+PLUGIN_NAME+'-loop]').length;

								if(loop === 0 && that.options.loop === false)
									that.$navigate.find('.'+PLUGIN_NAME+'-navigate-next').hide();
					    	}
				    	}

						if(that.options.overlay === true) {
							that.$overlay.appendTo('body');
						} else if($(that.options.overlay).length > 0) {
							that.$overlay.appendTo($(that.options.overlay));
						}

						if (that.options.transitionInOverlay) {
							that.$overlay.addClass(that.options.transitionInOverlay);
						}

						var transitionIn = that.options.transitionIn;

						if( typeof param == 'object' ){
							if(param.transition !== undefined || param.transitionIn !== undefined){
								transitionIn = param.transition || param.transitionIn;
							}
						}

						if (transitionIn !== '') {

							that.$element.addClass("transitionIn "+transitionIn).show();
							that.$wrap.one(animationEvent, function () {

							    that.$element.removeClass(transitionIn + " transitionIn");
							    that.$overlay.removeClass(that.options.transitionInOverlay);
							    that.$navigate.removeClass(that.options.transitionInOverlay);

								opened();
							});

						} else {
							that.$element.show();
							opened();
						}

						if(that.options.pauseOnHover === true && that.options.pauseOnHover === true && that.options.timeout !== false && !isNaN(parseInt(that.options.timeout)) && that.options.timeout !== false && that.options.timeout !== 0){

							that.$element.off('mouseenter').on('mouseenter', function(event) {
								event.preventDefault();
								that.isPaused = true;
							});
							that.$element.off('mouseleave').on('mouseleave', function(event) {
								event.preventDefault();
								that.isPaused = false;
							});
						}

					})();

					if (this.options.timeout !== false && !isNaN(parseInt(this.options.timeout)) && this.options.timeout !== false && this.options.timeout !== 0) {

						if (this.options.timeoutProgressbar === true) {

							this.progressBar = {
			                    hideEta: null,
			                    maxHideTime: null,
			                    currentTime: new Date().getTime(),
			                    el: this.$element.find('.'+PLUGIN_NAME+'-progressbar > div'),
			                    updateProgress: function()
			                    {
									if(!that.isPaused){
										
										that.progressBar.currentTime = that.progressBar.currentTime+10;

					                    var percentage = ((that.progressBar.hideEta - (that.progressBar.currentTime)) / that.progressBar.maxHideTime) * 100;
					                    that.progressBar.el.width(percentage + '%');
					                    if(percentage < 0){
					                    	that.close();
					                    }
									}
			                    }
			                };
							if (this.options.timeout > 0) {

		                        this.progressBar.maxHideTime = parseFloat(this.options.timeout);
		                        this.progressBar.hideEta = new Date().getTime() + this.progressBar.maxHideTime;
		                        this.timerTimeout = setInterval(this.progressBar.updateProgress, 10);
		                    }

						} else {

							this.timerTimeout = setTimeout(function(){
								that.close();
							}, that.options.timeout);
						}
					}

		            // Close on overlay click
		            if (this.options.overlayClose && !this.$element.hasClass(this.options.transitionOut)) {
		            	this.$overlay.click(function () {
		                    that.close();
		            	});
		            }

					if (this.options.focusInput){
				    	this.$element.find(':input:not(button):enabled:visible:first').focus(); // Focus on the first field
					}
					
					(function updateTimer(){
				    	that.recalcLayout();
					    that.timer = setTimeout(updateTimer, 100);
					})();

		            (function urlHash(){
						if(that.options.history){
			            	var oldTitle = document.title;
				            document.title = oldTitle + " - " + that.options.title;
							document.location.hash = that.id;
							document.title = oldTitle;
							//history.pushState({}, that.options.title, "#"+that.id);
						}
		            })();

		            // Close when the Escape key is pressed
		            $document.on('keydown.'+PLUGIN_NAME, function (e) {
		                if (that.options.closeOnEscape && e.keyCode === 27) {
		                    that.close();
		                }
		            });
			    }

			},

			close: function (param) {

				var that = this;

				function closed(){
	                
	                // console.info('[ '+PLUGIN_NAME+' | '+that.id+' ] Closed.');
	                that.state = STATES.CLOSED;
	                that.$element.trigger(STATES.CLOSED);

	                if (that.options.iframe === true) {
	                    that.$element.find('.'+PLUGIN_NAME+'-iframe').attr('src', "");
	                }

					if (that.options.bodyOverflow || isMobile){
						$('html').removeClass(PLUGIN_NAME+'-isOverflow');
						if(isMobile){
							$('body').css('overflow','auto');
						}
					}                
					
					if (that.options.onClosed && typeof(that.options.onClosed) === "function") {
				        that.options.onClosed(that);
				    }

					if(that.options.restoreDefaultContent === true){
					    that.$element.find('.'+PLUGIN_NAME+'-content').html( that.content );
					}

					if( $('.'+PLUGIN_NAME+':visible').attr('id') === undefined){
						$('html').removeClass(PLUGIN_NAME+'-isAttached');
					}
				}

	            if(this.state == STATES.OPENED || this.state == STATES.OPENING){

	            	$document.off('keydown.'+PLUGIN_NAME);

					this.state = STATES.CLOSING;
					this.$element.trigger(STATES.CLOSING);
					this.$element.attr('aria-hidden', 'true');

					// console.info('[ '+PLUGIN_NAME+' | '+this.id+' ] Closing...');

		            clearTimeout(this.timer);
		            clearTimeout(this.timerTimeout);

					if (that.options.onClosing && typeof(that.options.onClosing) === "function") {
				        that.options.onClosing(this);
				    }

					var transitionOut = this.options.transitionOut;

					if( typeof param == 'object' ){
						if(param.transition !== undefined || param.transitionOut !== undefined){
							transitionOut = param.transition || param.transitionOut;
						} 
					}

					if (transitionOut !== '') {

		                this.$element.attr('class', [
							this.classes,
							PLUGIN_NAME,
							transitionOut,
							this.options.theme == 'light' ? PLUGIN_NAME+'-light' : this.options.theme,
							this.isFullscreen === true ? 'isFullscreen' : '',
							this.options.rtl ? PLUGIN_NAME+'-rtl' : ''
						].join(' '));
						
						this.$overlay.attr('class', PLUGIN_NAME + "-overlay " + this.options.transitionOutOverlay);

						if(that.options.navigateArrows !== false){
							this.$navigate.attr('class', PLUGIN_NAME + "-navigate " + this.options.transitionOutOverlay);
						}

		                this.$element.one(animationEvent, function () {
		                    
		                    if( that.$element.hasClass(transitionOut) ){
		                        that.$element.removeClass(transitionOut + " transitionOut").hide();
		                    }
	                        that.$overlay.removeClass(that.options.transitionOutOverlay).remove();
							that.$navigate.removeClass(that.options.transitionOutOverlay).remove();
							closed();
		                });
		            }
		            else {
		                this.$element.hide();
		                this.$overlay.remove();
	                	this.$navigate.remove();
		                closed();
		            }
	            }
			},

			next: function (e){

	            var that = this;
	            var transitionIn = 'fadeInRight';
	            var transitionOut = 'fadeOutLeft';
				var modal = $('.'+PLUGIN_NAME+':visible');
	            var modals = {};
					modals.out = this;

				if(e !== undefined && typeof e !== 'object'){
	            	e.preventDefault();
	            	modal = $(e.currentTarget);
	            	transitionIn = modal.attr('data-'+PLUGIN_NAME+'-transitionIn');
	            	transitionOut = modal.attr('data-'+PLUGIN_NAME+'-transitionOut');
				} else if(e !== undefined){
					if(e.transitionIn !== undefined){
						transitionIn = e.transitionIn;
					}
					if(e.transitionOut !== undefined){
						transitionOut = e.transitionOut;
					}
				}

	        	this.close({transition:transitionOut});
	            
				setTimeout(function(){

					var loop = $('.'+PLUGIN_NAME+'[data-'+PLUGIN_NAME+'-group="'+that.group.name+'"][data-'+PLUGIN_NAME+'-loop]').length;
					for (var i = that.group.index+1; i <= that.group.ids.length; i++) {

						try {
							modals.in = $("#"+that.group.ids[i]).data().iziModal;
						} catch(log) {
							// console.info('[ '+PLUGIN_NAME+' ] No next modal.');
						}
						if(typeof modals.in !== 'undefined'){

							$("#"+that.group.ids[i]).iziModal('open', { transition: transitionIn });
							break;

						} else {

							if(i == that.group.ids.length && loop > 0 || that.options.loop === true){

								for (var index = 0; index <= that.group.ids.length; index++) {

									modals.in = $("#"+that.group.ids[index]).data().iziModal;
									if(typeof modals.in !== 'undefined'){
										$("#"+that.group.ids[index]).iziModal('open', { transition: transitionIn });								
										break;
									}
								}
							}
						}
					}

				}, 200);

				$(document).trigger( PLUGIN_NAME + "-group-change", modals );
			},

			prev: function (e){
	            var that = this;
	            var transitionIn = 'fadeInLeft';
	            var transitionOut = 'fadeOutRight';
				var modal = $('.'+PLUGIN_NAME+':visible');
	            var modals = {};
					modals.out = this;

				if(e !== undefined && typeof e !== 'object'){
	            	e.preventDefault();
	            	modal = $(e.currentTarget);
	            	transitionIn = modal.attr('data-'+PLUGIN_NAME+'-transitionIn');
	            	transitionOut = modal.attr('data-'+PLUGIN_NAME+'-transitionOut');
	            	
				} else if(e !== undefined){

					if(e.transitionIn !== undefined){
						transitionIn = e.transitionIn;
					}
					if(e.transitionOut !== undefined){
						transitionOut = e.transitionOut;
					}
				}

				this.close({transition:transitionOut});

				setTimeout(function(){

					var loop = $('.'+PLUGIN_NAME+'[data-'+PLUGIN_NAME+'-group="'+that.group.name+'"][data-'+PLUGIN_NAME+'-loop]').length;

					for (var i = that.group.index; i >= 0; i--) {

						try {
							modals.in = $("#"+that.group.ids[i-1]).data().iziModal;
						} catch(log) {
							// console.info('[ '+PLUGIN_NAME+' ] No previous modal.');
						}
						if(typeof modals.in !== 'undefined'){

							$("#"+that.group.ids[i-1]).iziModal('open', { transition: transitionIn });
							break;

						} else {

							if(i === 0 && loop > 0 || that.options.loop === true){

								for (var index = that.group.ids.length-1; index >= 0; index--) {

									modals.in = $("#"+that.group.ids[index]).data().iziModal;
									if(typeof modals.in !== 'undefined'){
										$("#"+that.group.ids[index]).iziModal('open', { transition: transitionIn });								
										break;
									}
								}
							}
						}
					}

				}, 200);

				$(document).trigger( PLUGIN_NAME + "-group-change", modals );
			},

			destroy: function () {
				var e = $.Event('destroy');

				this.$element.trigger(e);

	            $document.off('keydown.'+PLUGIN_NAME);

				clearTimeout(this.timer);
				clearTimeout(this.timerTimeout);

				if (this.options.iframe === true) {
					this.$element.find('.'+PLUGIN_NAME+'-iframe').remove();
				}
				this.$element.html(this.$element.find('.'+PLUGIN_NAME+'-content').html());

				this.$element.off('click', '[data-'+PLUGIN_NAME+'-close]');
				this.$element.off('click', '[data-'+PLUGIN_NAME+'-fullscreen]');

				this.$element
					.off('.'+PLUGIN_NAME)
					.removeData(PLUGIN_NAME)
					.attr('style', '');
				
				this.$overlay.remove();
				this.$navigate.remove();
				this.$element.trigger(STATES.DESTROYED);
				this.$element = null;
			},

			getState: function(){

				return this.state;
			},

			getGroup: function(){

				return this.group;
			},

			setWidth: function(width){

				this.options.width = width;

				this.recalcWidth();

				var modalWidth = this.$element.outerWidth();
	    		if(this.options.navigateArrows === true || this.options.navigateArrows == 'closeToModal'){
			    	this.$navigate.find('.'+PLUGIN_NAME+'-navigate-prev').css('margin-left', -((modalWidth/2)+84)).show();
			    	this.$navigate.find('.'+PLUGIN_NAME+'-navigate-next').css('margin-right', -((modalWidth/2)+84)).show();					    		
	    		}

			},

			setTop: function(top){

				this.options.top = top;

				this.recalcVerticalPos(false);
			},

			setBottom: function(bottom){

				this.options.bottom = bottom;

				this.recalcVerticalPos(false);

			},

			setTitle: function(title){

				if( this.$header.find('.'+PLUGIN_NAME+'-header-title').length === 0 ){
					this.$header.append('<h2 class="'+PLUGIN_NAME+'-header-title"></h2>');
				}

				this.$header.find('.'+PLUGIN_NAME+'-header-title').html(title);
				this.options.title = title;
			},

			setSubtitle: function(subtitle){


				if(subtitle === ''){
					
					this.$header.find('.'+PLUGIN_NAME+'-header-subtitle').remove();
					this.$header.addClass(PLUGIN_NAME+'-noSubtitle');

				} else {

					if( this.$header.find('.'+PLUGIN_NAME+'-header-subtitle').length === 0 ){
						this.$header.append('<p class="'+PLUGIN_NAME+'-header-subtitle"></p>');
					}
					this.$header.removeClass(PLUGIN_NAME+'-noSubtitle');

				}

				this.$header.find('.'+PLUGIN_NAME+'-header-subtitle').html(subtitle);
				this.options.subtitle = subtitle;
			},

			setIcon: function(icon){

				if( this.$header.find('.'+PLUGIN_NAME+'-header-icon').length === 0 ){
					this.$header.prepend('<i class="'+PLUGIN_NAME+'-header-icon"></i>');
				}
				this.$header.find('.'+PLUGIN_NAME+'-header-icon').attr('class', PLUGIN_NAME+'-header-icon ' + icon);
				this.options.icon = icon;
			},

			setIconText: function(iconText){

				this.$header.find('.'+PLUGIN_NAME+'-header-icon').html(iconText);
				this.options.iconText = iconText;
			},

			setHeaderColor: function(headerColor){

	            this.$element.css('border-bottom', '3px solid ' + headerColor + '');
	            this.$header.css('background', headerColor);
	            this.options.headerColor = headerColor;
			},

			setZindex: function(zIndex){

		        if (!isNaN(parseInt(this.options.zindex))) {
		        	this.options.zindex = zIndex;
				 	this.$element.css('z-index', zIndex);
				 	this.$navigate.css('z-index', zIndex-1);
				 	this.$overlay.css('z-index', zIndex-2);
		        }
			},

			setTransitionIn: function(transition){
				
				this.options.transitionIn = transition;
			},

			setTransitionOut: function(transition){

				this.options.transitionOut = transition;
			},

			startLoading: function(){

				if( !this.$element.find('.'+PLUGIN_NAME+'-loader').length ){
					this.$element.append('<div class="'+PLUGIN_NAME+'-loader '+this.options.transitionInOverlay+'"></div>');
				}
			},

			stopLoading: function(){
				
				var $loader = this.$element.find('.'+PLUGIN_NAME+'-loader');

				if( !$loader.length ){
					this.$element.prepend('<div class="'+PLUGIN_NAME+'-loader fadeIn"></div>');
					$loader = this.$element.find('.'+PLUGIN_NAME+'-loader');
				}
				$loader.removeClass('fadeIn').addClass('fadeOut');
				setTimeout(function(){
					$loader.remove();
				},600);
			},

			recalcWidth: function(){

	            this.$element.css('max-width', this.options.width);

	            if(isIE()){
	            	this.$element.css({
	            		left: '50%',
	            		marginLeft: -(this.options.width/2)
	            	});
	            }
			},

			recalcVerticalPos: function(first){

				if(this.options.top !== null && this.options.top !== false){
	            	this.$element.css('margin-top', this.options.top);
	            	if(this.options.top === 0){
	            		this.$element.css({
	            			borderTopRightRadius: 0,
	            			borderTopLeftRadius: 0
	            		});
	            	}
				} else {
					if(first === false){
						this.$element.css({
							marginTop: '',
	            			borderRadius: this.options.radius
	            		});
					}
				}
				if (this.options.bottom !== null && this.options.bottom !== false){
	            	this.$element.css('margin-bottom', this.options.bottom);
	            	if(this.options.bottom === 0){
	            		this.$element.css({
	            			borderBottomRightRadius: 0,
	            			borderBottomLeftRadius: 0
	            		});
	            	}
				} else {
					if(first === false){
						this.$element.css({
							marginBottom: '',
	            			borderRadius: this.options.radius
	            		});
					}
				}

			},

			recalcLayout: function(){

				var that = this,
	        		windowHeight = $window.height(),
	                modalHeight = this.$element.outerHeight(),
	                modalWidth = this.$element.outerWidth(),
	                contentHeight = this.$element.find('.'+PLUGIN_NAME+'-content')[0].scrollHeight,
                	outerHeight = contentHeight + this.headerHeight,
                	wrapperHeight = this.$element.innerHeight() - this.headerHeight,
	                modalMargin = parseInt(-((this.$element.innerHeight() + 1) / 2)) + 'px',
                	scrollTop = this.$wrap.scrollTop();

				if(isIE()){
					if( modalWidth >= $window.width() || this.isFullscreen === true ){
						this.$element.css({
							left: '',
							marginLeft: ''
						});
					} else {
		            	this.$element.css({
		            		left: '50%',
		            		marginLeft: -(this.options.width/2)
		            	});
					}
				}

	            if(this.$element.find('.'+PLUGIN_NAME+'-header').length){
	            	this.headerHeight = parseInt(this.$element.find('.'+PLUGIN_NAME+'-header').innerHeight()) + 2 /*border bottom of modal*/;
	            	this.$element.css('overflow', 'hidden');
	            }

				if(modalHeight !== this.modalHeight){
					this.modalHeight = modalHeight;

					if (this.options.onResize && typeof(this.options.onResize) === "function") {
				        this.options.onResize(this);
				    }
				}

	            if(this.state == STATES.OPENED || this.state == STATES.OPENING){

					if (this.options.iframe === true) {

						// If the height of the window is smaller than the modal with iframe
						if(windowHeight < (this.options.iframeHeight + this.headerHeight) || this.isFullscreen === true){
							this.$element.find('.'+PLUGIN_NAME+'-iframe').css( 'height', windowHeight - this.headerHeight);
						} else {
							this.$element.find('.'+PLUGIN_NAME+'-iframe').css( 'height', this.options.iframeHeight);
						}
					}

					if(modalHeight == windowHeight){
						this.$element.addClass('isAttached');
					} else {
						this.$element.removeClass('isAttached');
					}

	        		if(this.isFullscreen === false && this.$element.width() >= $window.width() ){
	        			this.$element.find('.'+PLUGIN_NAME+'-button-fullscreen').hide();
	        		} else {
	        			this.$element.find('.'+PLUGIN_NAME+'-button-fullscreen').show();
	        		}
					this.recalcButtons();

					if(this.isFullscreen === false){
 	                	windowHeight = windowHeight - (clearValue(this.options.top) || 0) - (clearValue(this.options.bottom) || 0);
					}
	                // If the modal is larger than the height of the window..
	                if (outerHeight > windowHeight) {
						if(this.options.top > 0 && this.options.bottom === null && contentHeight < $window.height()){
					    	this.$element.addClass('isAttachedBottom');
						}
						if(this.options.bottom > 0 && this.options.top === null && contentHeight < $window.height()){
					    	this.$element.addClass('isAttachedTop');
						}
						$('html').addClass(PLUGIN_NAME+'-isAttached');
						this.$element.css( 'height', windowHeight );

	                } else {
	                	this.$element.css('height', contentHeight + that.headerHeight);
			    		this.$element.removeClass('isAttachedTop isAttachedBottom');
			    		$('html').removeClass(PLUGIN_NAME+'-isAttached');
	                }

	                (function applyScroll(){
	                	if(contentHeight > wrapperHeight && outerHeight > windowHeight){
	                		that.$element.addClass('hasScroll');
	                		that.$wrap.css('height', modalHeight - that.headerHeight);
	                	} else {
	                		that.$element.removeClass('hasScroll');
	                		that.$wrap.css('height', 'auto');
	                	}
                	})();

		            (function applyShadow(){
		                if (wrapperHeight + scrollTop < (contentHeight - 30)) {
		                    that.$element.addClass('hasShadow');
		                } else {
		                    that.$element.removeClass('hasShadow');
		                }
					})();

	        	}
			},

			recalcButtons: function(){
				var widthButtons = this.$header.find('.'+PLUGIN_NAME+'-header-buttons').innerWidth()+10;
				if(this.options.rtl === true){
					this.$header.css('padding-left', widthButtons);
				} else {
					this.$header.css('padding-right', widthButtons);
				}
			}

		};



		$window.off('hashchange.'+PLUGIN_NAME+' load.'+PLUGIN_NAME).on('hashchange.'+PLUGIN_NAME+' load.'+PLUGIN_NAME, function(e) {

			var modalHash = document.location.hash;

			if(autoOpenModal === 0){

				if(modalHash !== ""){
					
					$.each( $('.'+PLUGIN_NAME) , function(index, modal) {
						 var state = $(modal).iziModal('getState');
						 if(state == 'opened' || state == 'opening'){
						 	
						 	if( "#" + $(modal).attr('id') !== modalHash){
						 		$(modal).iziModal('close');
						 	}
						 }
					});

					try {
						var data = $(modalHash).data();
						if(typeof data !== 'undefined'){
							if(e.type === 'load'){
								if(data.iziModal.options.autoOpen !== false){
									$(modalHash).iziModal("open");
								}
							} else {
								setTimeout(function(){
									$(modalHash).iziModal("open");
								},200);
							}
						}
					} catch(log) {
						// console.info(log);
					}

				} else {
					$.each( $('.'+PLUGIN_NAME) , function(index, modal) {
						if( $(modal).data().iziModal !== undefined ){
							var state = $(modal).iziModal('getState');
							if(state == 'opened' || state == 'opening'){
								$(modal).iziModal('close');
							}
						}
					});
				}
			} else {
				autoOpenModal = 0;
			}
		});

		$document.off('click', '[data-'+PLUGIN_NAME+'-open]').on('click', '[data-'+PLUGIN_NAME+'-open]', function(e) {
			e.preventDefault();

			var modal = $('.'+PLUGIN_NAME+':visible').attr('id');
			var openModal = $(e.currentTarget).attr('data-'+PLUGIN_NAME+'-open');
			var transitionIn = $(e.currentTarget).attr('data-'+PLUGIN_NAME+'-transitionIn');
			var transitionOut = $(e.currentTarget).attr('data-'+PLUGIN_NAME+'-transitionOut');

			if(transitionOut !== undefined){
				$("#"+modal).iziModal('close', {
					transition: transitionOut
				});
			} else {
				$("#"+modal).iziModal('close');
			}

			setTimeout(function(){
				if(transitionIn !== undefined){
					$("#"+openModal).iziModal('open', {
						transition: transitionIn
					});
				} else {
					$("#"+openModal).iziModal('open');
				}
			}, 200);
		});

		$document.off('keyup.'+PLUGIN_NAME).on('keyup.'+PLUGIN_NAME, function(event) {

			var modal = $('.'+PLUGIN_NAME+':visible').attr('id'),
				group = $("#"+modal).iziModal('getGroup'),
				e = event || window.event,
				target = e.target || e.srcElement,
				modals = {};

			if(modal !== undefined && group.name !== undefined && !e.ctrlKey && !e.metaKey && !e.altKey && target.tagName.toUpperCase() !== 'INPUT' && target.tagName.toUpperCase() != 'TEXTAREA'){ //&& $(e.target).is('body')

				if(e.keyCode === 37) { // left

					$("#"+modal).iziModal('prev', e);
				}
				else if(e.keyCode === 39 ) { // right

					$("#"+modal).iziModal('next', e);

				}
			}
		});

		$.fn[PLUGIN_NAME] = function(option, args) {

			if( !$(this).length ){

				var $div = document.createElement("div"),
					id = this.selector.split('#'),
					classes = this.selector.split('.');

				if(id.length > 1){

					$div.id = this.selector.split('#')[1];

				} else if(classes.length > 1){

					for (var x=1; x<classes.length; x++) {
						$div.classList.add(classes[x]);
					}
				}
				document.body.appendChild($div);

				this.push($(this.selector));
			}
			var objs = this;

			for (var i=0; i<objs.length; i++) {
				
				var $this = $(objs[i]);
				var data = $this.data(PLUGIN_NAME);
				var options = $.extend({}, $.fn[PLUGIN_NAME].defaults, $this.data(), typeof option == 'object' && option);

				if (!data && (!option || typeof option == 'object')){

					$this.data(PLUGIN_NAME, (data = new iziModal($this, options)));
				}
				else if (typeof option == 'string' && typeof data != 'undefined'){

					return data[option].apply(data, [].concat(args));
				}
				if (options.autoOpen){ // Automatically open the modal if autoOpen setted true or ms

					if( !isNaN(parseInt(options.autoOpen)) ){
						
						setTimeout(function(){
							data.open();
						}, options.autoOpen);

					} else if(options.autoOpen === true ) {
						
						setTimeout(function(){
							data.open();
						}, 0);
					}
					autoOpenModal++;
				}
			}

	        return this;
	    };

		$.fn[PLUGIN_NAME].defaults = {
		    title: '',
		    subtitle: '',
		    headerColor: '#88A0B9',
		    theme: '',  // light
		    appendTo: '.body', // or false
		    icon: null,
		    iconText: null,
		    iconColor: '',
		    rtl: false,
		    width: 600,
		    top: null,
		    bottom: null,
		    padding: 0,
		    radius: 3,
		    zindex: 999,
		    iframe: false,
		    iframeHeight: 400,
		    iframeURL: null,
		    focusInput: true,
		    group: '',
		    loop: false,
		    navigateCaption: true,
		    navigateArrows: true, // Boolean, 'closeToModal', 'closeScreenEdge'
		    history: false,
		    restoreDefaultContent: false,
		    autoOpen: 0, // Boolean, Number
		    bodyOverflow: false,
		    fullscreen: false,
		    openFullscreen: false,
		    closeOnEscape: true,
		    closeButton: true,
		    overlay: true,
		    overlayClose: true,
		    overlayColor: 'rgba(0, 0, 0, 0.4)',
		    timeout: false,
		    timeoutProgressbar: false,
		    pauseOnHover: false,
		    timeoutProgressbarColor: 'rgba(255,255,255,0.5)',
		    transitionIn: 'comingIn',   // comingIn, bounceInDown, bounceInUp, fadeInDown, fadeInUp, fadeInLeft, fadeInRight, flipInX
		    transitionOut: 'comingOut', // comingOut, bounceOutDown, bounceOutUp, fadeOutDown, fadeOutUp, , fadeOutLeft, fadeOutRight, flipOutX
		    transitionInOverlay: 'fadeIn',
		    transitionOutOverlay: 'fadeOut',
		    onFullscreen: function(){},
		    onResize: function(){},
	        onOpening: function(){},
	        onOpened: function(){},
	        onClosing: function(){},
	        onClosed: function(){}
		};

	$.fn[PLUGIN_NAME].Constructor = iziModal;

    return $.fn.iziModal;

}));