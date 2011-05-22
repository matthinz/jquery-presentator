/* :folding=explicit:collapseFolds=1: */

(function($) {

    // Helper Functions {{{

    function highest($elements) {

        var bestScore = null,
            $bestElement = null;

        $elements.each(function(i) {

            var $this = $(this);
            var depth = $(this).parents().length;
            if (bestScore === null || depth < bestScore) {
                $bestElement = $(this);
                bestScore = depth;
            }

        });

        return $bestElement;
    }

    // }}}

    $.presentator = {

        defaults: {

            advanceOnClick: false,

            defaultTransitionSpeed: 300,

            /**
             * Any elements with this class will have their children turned
             * into slides.
             */
            discloseClass: 'disclose',

            effects: {
                fade: {
                    show: 'fadeIn',
                    hide: 'fadeOut'
                }
            },

            /**
             * Selector used to specify what elements, when they receive mouse
             * or keyboard input, should not change the slide.
             */
            hotKeyFilter: 'a,button,input',

            /**
             * Class use to mark slides that, when shown, hide all their
             * sibling slides
             */
            replaceClass: 'replace',

            resize: true,

            /**
             * CSS class used to mark slides.
             */
            slideClass: 'slide'
        },

        disableSlideChanges: function() {
            this._disableSlideChange = true;
        },

        enableSlideChanges: function(delay) {

            var self = this;

            if (typeof(delay) != 'undefined') {
                window.setTimeout(
                    function() {
                        self.enableSlideChanges();
                    },
                    delay
                );
            } else {
                this._disableSlideChange = false;
            }
        },

        /**
         * nextSlide(speed) {{{
         */
        nextSlide: function(speed) {

            var self = this, o = self.options;
            var $current = self.$slide ? self.$slide : $([]),
                currentIndex = $.inArray($current[0], self.$allSlides);

            var nextIndex = currentIndex + 1;
            var $next = (nextIndex >= self.$allSlides.length) ? null : self.$allSlides.eq(nextIndex);

            if (!$next) {
                return false;
            }

            self.loadSlide($next, speed);

            return true;
        }, /* }}} */

        /**
         * prevSlide(speed) {{{
         */
        prevSlide: function(speed) {

            var self = this, o = self.options;
            var $current = self.$slide ? self.$slide : $([]),
                currentIndex = $.inArray($current[0], self.$allSlides)

            var prevIndex = currentIndex - 1,
                $prev = (prevIndex < 0) ? null : self.$allSlides.eq(prevIndex);

            if (!$prev) {
                return false;
            }

            self.loadSlide($prev);

            return true;
        }, /* }}} */

        /**
         * loadSlide(id, speed) {{{
         */
        loadSlide: function(id, speed) {

            var self = this, o = this.options;
            var $slide = null;

            if (self._disableSlideChange) {
                return;
            }

            window.scrollTop = 0;

            if (id) {

                if (id instanceof $) {
                    $slide = id;
                } else {
                    $slide = $('#' + id);
                    if ($slide.is(self.$slide) || $slide.is(':visible')) {
                        return;
                    }
                }

            }

            if (!$slide || !$slide.length) {
                $slide = (self.$slide && self.$slide.length) ? self.$slide : self.$allSlides.eq(0);
            }

            var newHash = $slide.length ? $slide.attr('id') : '';
            if (window.location.hash != newHash) {
                window.location.hash = newHash;
            }

            if (typeof(speed) == 'undefined') {
                speed = (typeof(id) == 'string') ? false : o.defaultTransitionSpeed;
            }

            var $toShow = $slide.add($slide.parents(o.slideSelector));
            $slide = $toShow.eq($toShow.length - 1);

            var replaceSiblings =
                $slide.parent().is(self.$container) || // Top-level slides
                $slide.is(o.replaceSelector);

            if (replaceSiblings) {
                // Hide what was previously shown
                $toHide = (self.$slide ? self.$slide : $([]));
                $toHide = $toHide.add($slide.siblings(o.slideSelector));
            } else {
                $toHide = $slide.nextAll(o.slideSelector);
            }

            // Always make sure the top-level slide's siblings are hidden
            var $topLevelSlide = $slide.parents(o.slideSelector + ':last');
            if (!$topLevelSlide.length) $topLevelSlide = $topLevelSlide.add($slide);
            $toHide = $toHide.add($topLevelSlide.siblings(o.slideSelector));

            // Don't hide things that are going to be re-shown
             $toHide = $toHide.filter(function() {
                return $.inArray(this, $toShow) < 0 && $(this).is(':visible');
            });

            self.$slide = $slide;

            var topLevelTransition = !$topLevelSlide.is(':visible');
            var $topToHide, $topToShow;

            if (topLevelTransition) {

                $topToHide = highest($toHide) || $([]);
                $topToShow = highest($toShow) || $([]);

                // Hide all children on the one being shown and show them
                // again selectively.
                $topToShow.find(o.slideSelector).hide();

                if (!$slide.is($topToShow)) {
                    // We are showing something in another slide,
                    // ensure that it and everything before it is visible
                    var $allBefore = $slide.prevAll(o.slideSelector);
                    $allBefore.find(o.slideSelector).andSelf().show();
                    $slide.show();
                }

            }

            if (speed !== false) {

                // Show/hide animatedly
                if (topLevelTransition) {
                    // Top-level transitions are fancier
                    $.presentator.crossFade($topToHide, $topToShow, speed, function() { self.enableSlideChanges(500); });

                } else {
                    self.disableSlideChanges();
                    var hideFunc = self.hide($toHide, speed, null, true);
                    var showFunc = self.show($toShow, speed, function() { self.enableSlideChanges(500); }, true);
                    hideFunc();
                    showFunc();
                }

            } else {
                $toHide.hide();
                $toShow.show();
                self.enableSlideChanges();
            }

        }, /* }}} */

        /**
         * doResize() {{{
         */
        doResize: function() {

            var $win = this.$window || (this.$window = $(window));
            var $c = this.$container;

            var windowHeight = $win.height();
            var pos = $c.position();

            $c.height(windowHeight - (pos.top * 2));


        }, /* }}} */

        /**
         * getEffectForSlide($slide) {{{
         */
        getEffectForSlide: function($slide) {

            var self = this, o = self.options;

            var effectToUse = { show: 'show', hide: 'hide' };
            jQuery.each(o.effects, function(name, effect) {
                if ($slide.hasClass(name)) {
                    effectToUse = effect;
                    return false;
                }

            });
            return effectToUse;
        }, /* }}} */

        /**
         * runEffect(action, $slide, effect, speed, complete, postpone) {{{
         */
        runEffect: function(action, $slide, effect, speed, complete, postpone) {

            var func = function() {

                if (effect === false) {
                    $slide[action]();
                    if (jQuery.isFunction(complete)) {
                        complete();
                    }
                    return;
                }

                $slide[effect[action]](speed, complete);
            };

            if (postpone) {
                return func;
            } else {
                func();
            }

        }, /* }}} */

        /**
         * show($slide, speed, complete, postpone) {{{
         */
        show: function($slide, speed, complete, postpone) {
            var effect = (speed === false) ? false : this.getEffectForSlide($slide);
            return this.runEffect('show', $slide, effect, speed, complete, postpone);
        }, /* }}} */

        /**
         * hide($slide, speed, complete, postpone) {{{
         */
        hide: function($slide, speed, complete, postpone) {
            var effect = (speed === false) ? false : this.getEffectForSlide($slide);
            return this.runEffect('hide', $slide, effect, speed, complete, postpone);
        }, /* }}} */

        /**
         * crossFade($toHide, $toShow, speed, complete) {{{
         */
        crossFade: function($toHide, $toShow, speed, complete) {

            speed = (typeof(speed) == 'undefined') ? 300 : speed;

            var $c = this.$container;
            var pos = $toHide.position();

            $toHide.css('z-index', 1000);
            $toShow.css('z-index', 0);

            $toHide
                .stop(true, true);

            $toShow
                .stop(true, true)
                .css({
                    opacity: 0,
                });

            if ($toHide.length) {
                $toShow.css({
                    position: 'absolute',
                    left: pos.left,
                    top: pos.top,
                    width: $toHide.width(),
                    display: 'block'
                });
            }

            $toHide
                .animate(
                    { opacity: 0 },
                    speed,
                    'linear',
                    function() {
                        $toHide.css('z-index', 'auto');
                        $toHide.css('display', 'none');
                    }
                );

            $toShow
                .animate(
                    { opacity: 1 },
                    speed,
                    'linear',
                    function() {
                        $toShow.css({position: 'static', 'z-index': 'auto'});
                        $toShow.css('display', '');

                        if ($.isFunction(complete)) {
                            complete();
                        }
                    }
                );
        } /* }}} */

    };

    $.fn.presentator = function(opts) {

        var p = $.presentator;
        p.options = o = $.extend({}, p.defaults, opts || {});

        // Turn all the *Class keys into *Selector keys
        jQuery.each(o, function(key, value) {
            var m = /(.*?)Class$/.exec(key);
            if (m) {
                o[m[1] + 'Selector'] = '.' + value;
            }
        });

        p.$container = $(this).css('position', 'relative');

        // Do some pre-processing
        p.$container.find(o.discloseSelector).children().addClass(o.slideClass);

        p.$allSlides = p.$container.find(o.slideSelector);
        p.$topLevelSlides = p.$container.children(o.slideSelector).hide();

        // Add IDs to those w/o
        p.$allSlides.each(function(i) {
            if (!this.id) this.id = 'slide_' + i;
        });

        $(document)
            .ready(function() {

                if ($.history) {
                    $.history.init(function(hash) { p.loadSlide(hash); });
                }

                if (o.resize) {
                    (p.$window = $(window)).resize(function() { p.doResize(); });
                    p.doResize();
                }

            })
            .click(function(e) {
                if (p.options.advanceOnClick && !$(e.target).is(o.hotKeyFilter)) {
                    e.preventDefault();
                    e.stopPropagation();
                    p.nextSlide();
                }
            })
            .keydown(function(e) {

                if ((e.which == 37 || e.which == 39) && !$(e.target).is(o.hotKeyFilter)) {

                    e.preventDefault();
                    e.stopPropagation();

                    switch(e.which) {
                        case 37:
                            p.prevSlide();
                            return false;
                        case 39:
                            p.nextSlide();
                            return false;
                    }

                }

            });

        return this;
    };


})(jQuery);
