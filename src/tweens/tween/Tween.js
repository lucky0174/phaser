/**
 * @author       Richard Davey <rich@photonstorm.com>
 * @copyright    2022 Photon Storm Ltd.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */

var BaseTween = require('./BaseTween');
var Class = require('../../utils/Class');
var Events = require('../events');
var GameObjectCreator = require('../../gameobjects/GameObjectCreator');
var GameObjectFactory = require('../../gameobjects/GameObjectFactory');
var TWEEN_CONST = require('./const');
var MATH_CONST = require('../../math/const');

/**
 * @classdesc
 * A Tween is able to manipulate the properties of one or more objects to any given value, based
 * on a duration and type of ease. They are rarely instantiated directly and instead should be
 * created via the TweenManager.
 *
 * Please note that a Tween will not manipulate any property that begins with an underscore.
 *
 * @class Tween
 * @memberof Phaser.Tweens
 * @extends Phaser.Events.EventEmitter
 * @constructor
 * @since 3.0.0
 *
 * @param {(Phaser.Tweens.TweenManager|Phaser.Tweens.Timeline)} parent - A reference to the parent of this Tween. Either the Tween Manager or a Tween Timeline instance.
 * @param {Phaser.Types.Tweens.TweenDataConfig[]} data - An array of TweenData objects, each containing a unique property to be tweened.
 * @param {array} targets - An array of targets to be tweened.
 */
var Tween = new Class({

    Extends: BaseTween,

    initialize:

    function Tween (parent, data, targets)
    {
        BaseTween.call(this, parent, data);

        /**
         * An array of references to the target/s this Tween is operating on.
         *
         * @name Phaser.Tweens.Tween#targets
         * @type {object[]}
         * @since 3.0.0
         */
        this.targets = targets;

        /**
         * Cached target total (not necessarily the same as the data total)
         *
         * @name Phaser.Tweens.Tween#totalTargets
         * @type {number}
         * @since 3.0.0
         */
        this.totalTargets = targets.length;

        /**
         * Time in ms/frames before the 'onStart' event fires.
         * This is the shortest `delay` value across all of the TweenDatas of this Tween.
         *
         * @name Phaser.Tweens.Tween#startDelay
         * @type {number}
         * @default 0
         * @since 3.19.0
         */
        this.startDelay = 0;

        /**
         * Has this Tween started playback yet?
         * This boolean is toggled when the Tween leaves the 'delayed' state and starts running.
         *
         * @name Phaser.Tweens.Tween#hasStarted
         * @type {boolean}
         * @readonly
         * @since 3.19.0
         */
        this.hasStarted = false;

        /**
         * Is this Tween currently seeking?
         * This boolean is toggled in the `Tween.seek` method.
         * When a tween is seeking it will not dispatch any events or callbacks.
         *
         * @name Phaser.Tweens.Tween#isSeeking
         * @type {boolean}
         * @readonly
         * @since 3.19.0
         */
        this.isSeeking = false;

        /**
         * This property is set only if this Tween is part of a Timeline.
         *
         * @name Phaser.Tweens.Tween#offset
         * @type {number}
         * @default 0
         * @since 3.0.0
         */
        this.offset = 0;

        /**
         * This property is set only if this Tween is part of a Timeline. The calculated offset amount.
         *
         * @name Phaser.Tweens.Tween#calculatedOffset
         * @type {number}
         * @default 0
         * @since 3.0.0
         */
        this.calculatedOffset = 0;

        //  Prepare this tween for playback
        this.init();
    },

    /**
     * Prepares this Tween for playback.
     * Called by the Tween constructor and should not be called directly.
     *
     * @method Phaser.Tweens.Tween#init
     * @since 3.0.0
     */
    init: function ()
    {
        var data = this.data;
        var totalTargets = this.totalTargets;

        for (var i = 0; i < this.totalData; i++)
        {
            var tweenData = data[i];

            var target = tweenData.target;
            var key = tweenData.key;
            var targetIndex = tweenData.index;

            var gen = tweenData.gen;

            //  Function signature: target, key, value, index, total, tween

            tweenData.delay = gen.delay(target, key, 0, targetIndex, totalTargets, this);
            tweenData.duration = Math.max(gen.duration(target, key, 0, targetIndex, totalTargets, this), 0.001);
            tweenData.hold = gen.hold(target, key, 0, targetIndex, totalTargets, this);
            tweenData.repeat = gen.repeat(target, key, 0, targetIndex, totalTargets, this);
            tweenData.repeatDelay = gen.repeatDelay(target, key, 0, targetIndex, totalTargets, this);
            tweenData.repeatCounter = (tweenData.repeat === -1) ? 999999999999 : tweenData.repeat;
            tweenData.state = TWEEN_CONST.PENDING_RENDER;

            if (tweenData.delay > 0)
            {
                tweenData.elapsed = tweenData.delay;
                tweenData.state = TWEEN_CONST.DELAY;
            }

            if (tweenData.getActiveValue)
            {
                target[key] = tweenData.getActiveValue(tweenData.target, tweenData.key, tweenData.start);
            }
        }

        this.calcDuration();

        this.progress = 0;
        this.totalProgress = 0;
        this.elapsed = 0;
        this.totalElapsed = 0;

        this.state = TWEEN_CONST.PLAYING;
    },

    /**
     * Internal method that calculates the overall duration of the Tween.
     *
     * @method Phaser.Tweens.Tween#calcDuration
     * @since 3.0.0
     */
    calcDuration: function ()
    {
        var maxDuration = 0;
        var minDelay = MATH_CONST.MAX_SAFE_INTEGER;

        var data = this.data;

        for (var i = 0; i < this.totalData; i++)
        {
            var tweenData = data[i];

            //  Set t1 (duration + hold + yoyo)
            tweenData.t1 = tweenData.duration + tweenData.hold;

            if (tweenData.yoyo)
            {
                tweenData.t1 += tweenData.duration;
            }

            //  Set t2 (repeatDelay + duration + hold + yoyo)
            tweenData.t2 = tweenData.t1 + tweenData.repeatDelay;

            //  Total Duration
            tweenData.totalDuration = tweenData.delay + tweenData.t1;

            if (tweenData.repeat === -1)
            {
                tweenData.totalDuration += (tweenData.t2 * 999999999999);
            }
            else if (tweenData.repeat > 0)
            {
                tweenData.totalDuration += (tweenData.t2 * tweenData.repeat);
            }

            if (tweenData.totalDuration > maxDuration)
            {
                //  Get the longest TweenData from the Tween, used to calculate the Tween TD
                maxDuration = tweenData.totalDuration;
            }

            if (tweenData.delay < minDelay)
            {
                minDelay = tweenData.delay;
            }
        }

        //  Excludes loop values

        //  If duration has been set to 0 then we give it a super-low value so that it always
        //  renders at least 1 frame, but no more, without causing divided by zero errors elsewhere.
        this.duration = Math.max(maxDuration, 0.001);

        this.loopCounter = (this.loop === -1) ? 999999999999 : this.loop;

        if (this.loopCounter > 0)
        {
            this.totalDuration = this.duration + this.completeDelay + ((this.duration + this.loopDelay) * this.loopCounter);
        }
        else
        {
            this.totalDuration = this.duration + this.completeDelay;
        }

        //  How long before this Tween starts playback?
        this.startDelay = minDelay;
    },

    /**
     * Returns the current value of the specified Tween Data.
     *
     * @method Phaser.Tweens.Tween#getValue
     * @since 3.0.0
     *
     * @param {number} [index=0] - The Tween Data to return the value from.
     *
     * @return {number} The value of the requested Tween Data.
     */
    getValue: function (index)
    {
        if (index === undefined) { index = 0; }

        return this.data[index].current;
    },

    /**
     * See if this Tween is currently acting upon the given target.
     *
     * @method Phaser.Tweens.Tween#hasTarget
     * @since 3.0.0
     *
     * @param {object} target - The target to check against this Tween.
     *
     * @return {boolean} `true` if the given target is a target of this Tween, otherwise `false`.
     */
    hasTarget: function (target)
    {
        return (this.targets.indexOf(target) !== -1);
    },

    /**
     * Updates the 'end' value of the given property across all matching targets.
     *
     * Calling this does not adjust the duration of the tween, or the current progress.
     *
     * You can optionally tell it to set the 'start' value to be the current value (before the change).
     *
     * @method Phaser.Tweens.Tween#updateTo
     * @since 3.0.0
     *
     * @param {string} key - The property to set the new value for.
     * @param {*} value - The new value of the property.
     * @param {boolean} [startToCurrent=false] - Should this change set the start value to be the current value?
     *
     * @return {this} This Tween instance.
     */
    updateTo: function (key, value, startToCurrent)
    {
        if (startToCurrent === undefined) { startToCurrent = false; }

        for (var i = 0; i < this.totalData; i++)
        {
            var tweenData = this.data[i];

            if (tweenData.key === key)
            {
                tweenData.end = value;

                if (startToCurrent)
                {
                    tweenData.start = tweenData.current;
                }
            }
        }

        return this;
    },

    /**
     * Restarts the tween from the beginning.
     *
     * @method Phaser.Tweens.Tween#restart
     * @since 3.0.0
     *
     * @return {this} This Tween instance.
     */
    restart: function ()
    {
        //  Reset these so they're ready for the next update
        this.elapsed = 0;
        this.progress = 0;
        this.totalElapsed = 0;
        this.totalProgress = 0;

        if (this.state === TWEEN_CONST.PLAYING)
        {
            this.seek(0);
        }
        else if (this.state === TWEEN_CONST.REMOVED)
        {
            this.seek(0);
            this.parent.makeActive(this);
        }
        else if (this.state === TWEEN_CONST.PENDING_REMOVE)
        {
            this.parent.reset(this);
        }
        else
        {
            this.play();
        }

        return this;
    },

    /**
     * Internal method that advances to the next state of the Tween during playback.
     *
     * @method Phaser.Tweens.Tween#nextState
     * @fires Phaser.Tweens.Events#TWEEN_COMPLETE
     * @fires Phaser.Tweens.Events#TWEEN_LOOP
     * @since 3.0.0
     */
    nextState: function ()
    {
        if (this.loopCounter > 0)
        {
            this.elapsed = 0;
            this.progress = 0;
            this.loopCounter--;

            this.resetTweenData(true);

            if (this.loopDelay > 0)
            {
                this.countdown = this.loopDelay;
                this.state = TWEEN_CONST.LOOP_DELAY;
            }
            else
            {
                this.state = TWEEN_CONST.PLAYING;

                this.dispatchEvent(Events.TWEEN_LOOP, this.callbacks.onLoop);
            }
        }
        else if (this.completeDelay > 0)
        {
            this.state = TWEEN_CONST.COMPLETE_DELAY;

            this.countdown = this.completeDelay;
        }
        else
        {
            this.state = TWEEN_CONST.PENDING_REMOVE;

            this.dispatchEvent(Events.TWEEN_COMPLETE, this.callbacks.onComplete);
        }
    },

    /**
     * Starts a Tween playing.
     *
     * You only need to call this method if you have configured the tween to be paused on creation.
     *
     * If the Tween is already playing, calling this method again will have no effect. If you wish to
     * restart the Tween, use `Tween.restart` instead.
     *
     * Calling this method after the Tween has completed will start the Tween playing again from the beginning.
     * This is the same as calling `Tween.seek(0)` and then `Tween.play()`.
     *
     * @method Phaser.Tweens.Tween#play
     * @since 3.0.0
     *
     * @param {boolean} [resetFromTimeline=false] - Is this Tween being played as part of a Timeline?
     *
     * @return {this} This Tween instance.
     */
    play: function (resetFromTimeline)
    {
        if (resetFromTimeline === undefined) { resetFromTimeline = false; }

        var state = this.state;

        if (!this.parentIsTimeline)
        {
            if (state === TWEEN_CONST.PENDING_REMOVE || state === TWEEN_CONST.REMOVED)
            {
                //  This makes the tween active as well:
                this.seek(0);
            }

            this.paused = false;
            this.state = TWEEN_CONST.PLAYING;

            //  When should we call this?
            // this.resetTweenData(resetFromTimeline);
            // this.makeActive();
        }
        else
        {
            this.resetTweenData(resetFromTimeline);

            if (this.calculatedOffset === 0)
            {
                this.state = TWEEN_CONST.PLAYING;
            }
            else
            {
                this.countdown = this.calculatedOffset;

                this.state = TWEEN_CONST.OFFSET_DELAY;
            }
        }

        /*
        if (state === TWEEN_CONST.INIT && !this.parentIsTimeline)
        {
            this.resetTweenData(false);

            this.state = TWEEN_CONST.PLAYING;

            return this;
        }
        else if (!this.parentIsTimeline && (state === TWEEN_CONST.PENDING_REMOVE || state === TWEEN_CONST.REMOVED))
        {
            this.seek(0);
            this.parent.makeActive(this);

            return this;
        }

        if (this.parentIsTimeline)
        {
            this.resetTweenData(resetFromTimeline);

            if (this.calculatedOffset === 0)
            {
                this.state = TWEEN_CONST.PLAYING;
            }
            else
            {
                this.countdown = this.calculatedOffset;

                this.state = TWEEN_CONST.OFFSET_DELAY;
            }
        }
        else if (this.paused)
        {
            this.paused = false;

            this.makeActive();
        }
        else
        {
            this.resetTweenData(resetFromTimeline);

            this.state = TWEEN_CONST.PLAYING;

            this.makeActive();
        }
        */

        return this;
    },

    /**
     * Internal method that resets all of the Tween Data, including the progress and elapsed values.
     *
     * @method Phaser.Tweens.Tween#resetTweenData
     * @since 3.0.0
     *
     * @param {boolean} resetFromLoop - Has this method been called as part of a loop?
     */
    resetTweenData: function (resetFromLoop)
    {
        var data = this.data;
        var total = this.totalData;
        var totalTargets = this.totalTargets;

        for (var i = 0; i < total; i++)
        {
            var tweenData = data[i];

            var target = tweenData.target;
            var key = tweenData.key;
            var targetIndex = tweenData.index;

            tweenData.progress = 0;
            tweenData.elapsed = 0;

            tweenData.repeatCounter = (tweenData.repeat === -1) ? 999999999999 : tweenData.repeat;

            if (resetFromLoop)
            {
                tweenData.start = tweenData.getStartValue(target, key, tweenData.start, targetIndex, totalTargets, this);

                tweenData.end = tweenData.getEndValue(target, key, tweenData.end, targetIndex, totalTargets, this);

                tweenData.current = tweenData.start;

                tweenData.state = TWEEN_CONST.PLAYING_FORWARD;
            }
            else
            {
                tweenData.state = TWEEN_CONST.PENDING_RENDER;
            }

            if (tweenData.delay > 0)
            {
                tweenData.elapsed = tweenData.delay;

                tweenData.state = TWEEN_CONST.DELAY;
            }

            if (tweenData.getActiveValue)
            {
                target[key] = tweenData.getActiveValue(tweenData.target, tweenData.key, tweenData.start);
            }
        }
    },

    /**
     * Seeks to a specific point in the Tween.
     *
     * **Note:** Be careful when seeking a Tween that repeats or loops forever,
     * or that has an unusually long total duration, as it's possible to hang the browser.
     *
     * The given position is a value between 0 and 1 which represents how far through the Tween to seek to.
     * A value of 0.5 would seek to half-way through the Tween, where-as a value of zero would seek to the start.
     *
     * Note that the seek takes the entire duration of the Tween into account, including delays, loops and repeats.
     * For example, a Tween that lasts for 2 seconds, but that loops 3 times, would have a total duration of 6 seconds,
     * so seeking to 0.5 would seek to 3 seconds into the Tween, as that's half-way through its _entire_ duration.
     *
     * Seeking works by resetting the Tween to its initial values and then iterating through the Tween at `delta`
     * jumps per step. The longer the Tween, the longer this can take.
     *
     * @method Phaser.Tweens.Tween#seek
     * @since 3.0.0
     *
     * @param {number} toPosition - A value between 0 and 1 which represents the progress point to seek to.
     * @param {number} [delta=16.6] - The size of each step when seeking through the Tween. A higher value completes faster but at the cost of less precision.
     *
     * @return {this} This Tween instance.
     */
    seek: function (toPosition, delta)
    {
        if (delta === undefined) { delta = 16.6; }

        if (this.state === TWEEN_CONST.REMOVED)
        {
            this.makeActive();
        }

        this.elapsed = 0;
        this.progress = 0;
        this.totalElapsed = 0;
        this.totalProgress = 0;

        var data = this.data;
        var totalTargets = this.totalTargets;

        for (var i = 0; i < this.totalData; i++)
        {
            var tweenData = data[i];
            var target = tweenData.target;
            var gen = tweenData.gen;
            var key = tweenData.key;
            var targetIndex = tweenData.index;

            tweenData.progress = 0;
            tweenData.elapsed = 0;

            tweenData.repeatCounter = (tweenData.repeat === -1) ? 999999999999 : tweenData.repeat;

            //  Function signature: target, key, value, index, total, tween

            tweenData.delay = gen.delay(target, key, 0, targetIndex, totalTargets, this);
            tweenData.duration = Math.max(gen.duration(target, key, 0, targetIndex, totalTargets, this), 0.001);
            tweenData.hold = gen.hold(target, key, 0, targetIndex, totalTargets, this);
            tweenData.repeat = gen.repeat(target, key, 0, targetIndex, totalTargets, this);
            tweenData.repeatDelay = gen.repeatDelay(target, key, 0, targetIndex, totalTargets, this);

            tweenData.current = tweenData.start;
            tweenData.state = TWEEN_CONST.PLAYING_FORWARD;

            this.updateTweenData(this, tweenData, 0, targetIndex, totalTargets);

            if (tweenData.delay > 0)
            {
                tweenData.elapsed = tweenData.delay;
                tweenData.state = TWEEN_CONST.DELAY;
            }
        }

        this.calcDuration();

        if (toPosition > 0)
        {
            this.isSeeking = true;

            do
            {
                this.update(0, delta);

            } while (this.totalProgress < toPosition);

            this.isSeeking = false;
        }

        return this;
    },

    /**
     * Flags the Tween as being complete, whatever stage of progress it is at.
     *
     * If an onComplete callback has been defined it will automatically invoke it, unless a `delay`
     * argument is provided, in which case the Tween will delay for that period of time before calling the callback.
     *
     * If you don't need a delay, or have an onComplete callback, then call `Tween.stop` instead.
     *
     * @method Phaser.Tweens.Tween#complete
     * @fires Phaser.Tweens.Events#TWEEN_COMPLETE
     * @since 3.2.0
     *
     * @param {number} [delay=0] - The time to wait before invoking the complete callback. If zero it will fire immediately.
     *
     * @return {this} This Tween instance.
     */
    complete: function (delay)
    {
        if (delay === undefined) { delay = 0; }

        if (delay)
        {
            this.state = TWEEN_CONST.COMPLETE_DELAY;

            this.countdown = delay;
        }
        else
        {
            this.state = TWEEN_CONST.PENDING_REMOVE;

            this.dispatchEvent(Events.TWEEN_COMPLETE, this.callbacks.onComplete);
        }

        return this;
    },

    /**
     * Immediately removes this Tween from the TweenManager and all of its internal arrays,
     * no matter what stage it as it. Then sets the tween state to `REMOVED`.
     *
     * You should dispose of your reference to this tween after calling this method, to
     * free it from memory.
     *
     * @method Phaser.Tweens.Tween#remove
     * @since 3.17.0
     *
     * @return {this} This Tween instance.
     */
    remove: function ()
    {
        this.parent.remove(this);

        return this;
    },

    /**
     * Stops the Tween immediately, whatever stage of progress it is at and flags it for removal by the Tween Manager.
     *
     * @method Phaser.Tweens.Tween#stop
     * @since 3.0.0
     *
     * @param {number} [resetTo] - If you want to seek the tween, provide a value between 0 and 1.
     *
     * @return {this} This Tween instance.
     */
    stop: function (resetTo)
    {
        if (this.state === TWEEN_CONST.PLAYING && resetTo !== undefined)
        {
            this.seek(resetTo);
        }

        if (this.state !== TWEEN_CONST.REMOVED)
        {
            this.dispatchEvent(Events.TWEEN_STOP, this.callbacks.onStop);

            this.removeAllListeners();

            this.state = TWEEN_CONST.PENDING_REMOVE;
        }

        return this;
    },

    /**
     * Internal method that advances the Tween based on the time values.
     *
     * @method Phaser.Tweens.Tween#update
     * @fires Phaser.Tweens.Events#TWEEN_COMPLETE
     * @fires Phaser.Tweens.Events#TWEEN_LOOP
     * @fires Phaser.Tweens.Events#TWEEN_START
     * @since 3.0.0
     *
     * @param {number} timestamp - The current time. Either a High Resolution Timer value if it comes from Request Animation Frame, or Date.now if using SetTimeout.
     * @param {number} delta - The delta time in ms since the last frame. This is a smoothed and capped value based on the FPS rate.
     *
     * @return {boolean} Returns `true` if this Tween has finished and should be removed from the Tween Manager, otherwise returns `false`.
     */
    update: function (timestamp, delta)
    {
        if (this.state === TWEEN_CONST.PENDING_REMOVE || this.state === TWEEN_CONST.DESTROYED)
        {
            return true;
        }

        if (this.paused && !this.isSeeking)
        {
            return false;
        }

        if (this.useFrames)
        {
            delta = 1 * this.parent.timeScale;
        }
        else
        {
            delta *= this.timeScale * this.parent.timeScale;
        }

        this.elapsed += delta;
        this.progress = Math.min(this.elapsed / this.duration, 1);

        this.totalElapsed += delta;
        this.totalProgress = Math.min(this.totalElapsed / this.totalDuration, 1);

        var state = this.state;

        if (state === TWEEN_CONST.LOOP_DELAY)
        {
            this.updateCountdown(delta, TWEEN_CONST.PLAYING, Events.TWEEN_LOOP, this.callbacks.onLoop);
        }
        else if (state === TWEEN_CONST.OFFSET_DELAY)
        {
            this.updateCountdown(delta, TWEEN_CONST.PLAYING);
        }
        else if (state === TWEEN_CONST.COMPLETE_DELAY)
        {
            this.updateCountdown(delta, TWEEN_CONST.PENDING_REMOVE, Events.TWEEN_COMPLETE, this.callbacks.onComplete);
        }

        //  Make its own check so the states above can toggle to active on this frame
        if (this.state === TWEEN_CONST.PLAYING)
        {
            this.updateActive(delta);
        }

        return (this.state === TWEEN_CONST.PENDING_REMOVE);
    },

    updateCountdown: function (delta, state, event, callback)
    {
        this.countdown -= delta;

        if (this.countdown <= 0)
        {
            this.state = state;

            if (callback)
            {
                this.dispatchEvent(event, callback);
            }
        }
    },

    updateActive: function (delta)
    {
        if (!this.hasStarted && !this.isSeeking)
        {
            this.startDelay -= delta;

            if (this.startDelay <= 0)
            {
                this.hasStarted = true;

                this.dispatchEvent(Events.TWEEN_START, this.callbacks.onStart);
            }
        }

        var stillRunning = false;

        for (var i = 0; i < this.totalData; i++)
        {
            if (this.updateTweenData(this, this.data[i], delta))
            {
                stillRunning = true;
            }
        }

        //  Anything still running? If not, we're done
        if (!stillRunning)
        {
            this.nextState();
        }
    },

    destroy: function ()
    {
        BaseTween.prototype.destroy.call(this);

        for (var i = 0; i < this.totalData; i++)
        {
            var data = this.data[i];

            data.target = null;
            data.getActiveValue = null;
            data.getEndValue = null;
            data.getStartValue = null;
            data.ease = null;
            data.gen = null;
        }

        this.data = null;
        this.targets = null;
    },

    /**
     * Internal method that will emit a TweenData based Event and invoke the given callback.
     *
     * @method Phaser.Tweens.Tween#dispatchTweenDataEvent
     * @since 3.19.0
     *
     * @param {Phaser.Types.Tweens.Event} event - The Event to be dispatched.
     * @param {function} callback - The callback to be invoked. Can be `null` or `undefined` to skip invocation.
     * @param {Phaser.Types.Tweens.TweenDataConfig} tweenData - The TweenData object that caused this event.
     */
    dispatchTweenDataEvent: function (event, callback, tweenData)
    {
        if (!this.isSeeking)
        {
            this.emit(event, this, tweenData.key, tweenData.target, tweenData.current, tweenData.previous);

            if (callback)
            {
                callback.params[1] = tweenData.target;

                callback.func.apply(callback.scope, callback.params);
            }
        }
    },

    /**
     * Internal method that will emit a Tween based Event and invoke the given callback.
     *
     * @method Phaser.Tweens.Tween#dispatchEvent
     * @since 3.60.0
     *
     * @param {Phaser.Types.Tweens.Event} event - The Event to be dispatched.
     * @param {function} callback - The callback to be invoked. Can be `null` or `undefined` to skip invocation.
     */
    dispatchEvent: function (event, callback)
    {
        if (!this.isSeeking)
        {
            this.emit(event, this, this.targets);

            if (callback)
            {
                callback.params[1] = this.targets;

                callback.func.apply(callback.scope, callback.params);
            }
        }
    },

    /**
     * Internal method used as part of the playback process that sets a tween to play in reverse.
     *
     * @method Phaser.Tweens.Tween#setStateFromEnd
     * @fires Phaser.Tweens.Events#TWEEN_REPEAT
     * @fires Phaser.Tweens.Events#TWEEN_YOYO
     * @since 3.0.0
     *
     * @param {Phaser.Tweens.Tween} tween - The Tween to update.
     * @param {Phaser.Types.Tweens.TweenDataConfig} tweenData - The TweenData property to update.
     * @param {number} diff - Any extra time that needs to be accounted for in the elapsed and progress values.
     *
     * @return {number} The state of this Tween.
     */
    setStateFromEnd: function (tween, tweenData, diff)
    {
        if (tweenData.yoyo)
        {
            //  We've hit the end of a Playing Forward TweenData and we have a yoyo

            //  Account for any extra time we got from the previous frame
            tweenData.elapsed = diff;
            tweenData.progress = diff / tweenData.duration;

            if (tweenData.flipX)
            {
                tweenData.target.toggleFlipX();
            }

            if (tweenData.flipY)
            {
                tweenData.target.toggleFlipY();
            }

            this.dispatchTweenDataEvent(Events.TWEEN_YOYO, tween.callbacks.onYoyo, tweenData);

            tweenData.start = tweenData.getStartValue(tweenData.target, tweenData.key, tweenData.start, tweenData.index, tween.totalTargets, tween);

            return TWEEN_CONST.PLAYING_BACKWARD;
        }
        else if (tweenData.repeatCounter > 0)
        {
            //  We've hit the end of a Playing Forward TweenData and we have a Repeat.
            //  So we're going to go right back to the start to repeat it again.

            tweenData.repeatCounter--;

            //  Account for any extra time we got from the previous frame
            tweenData.elapsed = diff;
            tweenData.progress = diff / tweenData.duration;

            if (tweenData.flipX)
            {
                tweenData.target.toggleFlipX();
            }

            if (tweenData.flipY)
            {
                tweenData.target.toggleFlipY();
            }

            tweenData.start = tweenData.getStartValue(tweenData.target, tweenData.key, tweenData.start, tweenData.index, tween.totalTargets, tween);

            tweenData.end = tweenData.getEndValue(tweenData.target, tweenData.key, tweenData.start, tweenData.index, tween.totalTargets, tween);

            //  Delay?
            if (tweenData.repeatDelay > 0)
            {
                tweenData.elapsed = tweenData.repeatDelay - diff;

                tweenData.current = tweenData.start;

                tweenData.target[tweenData.key] = tweenData.current;

                return TWEEN_CONST.REPEAT_DELAY;
            }
            else
            {
                this.dispatchTweenDataEvent(Events.TWEEN_REPEAT, tween.callbacks.onRepeat, tweenData);

                return TWEEN_CONST.PLAYING_FORWARD;
            }
        }

        return TWEEN_CONST.COMPLETE;
    },

    /**
     * Internal method used as part of the playback process that sets a tween to play from the start.
     *
     * @method Phaser.Tweens.Tween#setStateFromStart
     * @fires Phaser.Tweens.Events#TWEEN_REPEAT
     * @since 3.0.0
     *
     * @param {Phaser.Tweens.Tween} tween - The Tween to update.
     * @param {Phaser.Types.Tweens.TweenDataConfig} tweenData - The TweenData property to update.
     * @param {number} diff - Any extra time that needs to be accounted for in the elapsed and progress values.
     *
     * @return {number} The state of this Tween.
     */
    setStateFromStart: function (tween, tweenData, diff)
    {
        if (tweenData.repeatCounter > 0)
        {
            tweenData.repeatCounter--;

            //  Account for any extra time we got from the previous frame
            tweenData.elapsed = diff;
            tweenData.progress = diff / tweenData.duration;

            if (tweenData.flipX)
            {
                tweenData.target.toggleFlipX();
            }

            if (tweenData.flipY)
            {
                tweenData.target.toggleFlipY();
            }

            tweenData.end = tweenData.getEndValue(tweenData.target, tweenData.key, tweenData.start, tweenData.index, tween.totalTargets, tween);

            //  Delay?
            if (tweenData.repeatDelay > 0)
            {
                tweenData.elapsed = tweenData.repeatDelay - diff;

                tweenData.current = tweenData.start;

                tweenData.target[tweenData.key] = tweenData.current;

                return TWEEN_CONST.REPEAT_DELAY;
            }
            else
            {
                this.dispatchTweenDataEvent(Events.TWEEN_REPEAT, tween.callbacks.onRepeat, tweenData);

                return TWEEN_CONST.PLAYING_FORWARD;
            }
        }

        return TWEEN_CONST.COMPLETE;
    },

    /**
     * Internal method that advances the TweenData based on the time value given.
     *
     * @method Phaser.Tweens.Tween#updateTweenData
     * @fires Phaser.Tweens.Events#TWEEN_UPDATE
     * @fires Phaser.Tweens.Events#TWEEN_REPEAT
     * @since 3.0.0
     *
     * @param {Phaser.Tweens.Tween} tween - The Tween to update.
     * @param {Phaser.Types.Tweens.TweenDataConfig} tweenData - The TweenData property to update.
     * @param {number} delta - Either a value in ms, or 1 if Tween.useFrames is true.
     *
     * @return {boolean} True if the tween is not complete (e.g., playing), or false if the tween is complete.
     */
    updateTweenData: function (tween, tweenData, delta)
    {
        var target = tweenData.target;

        switch (tweenData.state)
        {
            case TWEEN_CONST.PLAYING_FORWARD:
            case TWEEN_CONST.PLAYING_BACKWARD:

                if (!target)
                {
                    tweenData.state = TWEEN_CONST.COMPLETE;
                    break;
                }

                var elapsed = tweenData.elapsed;
                var duration = tweenData.duration;
                var diff = 0;

                elapsed += delta;

                if (elapsed > duration)
                {
                    diff = elapsed - duration;
                    elapsed = duration;
                }

                var forward = (tweenData.state === TWEEN_CONST.PLAYING_FORWARD);
                var progress = elapsed / duration;

                tweenData.elapsed = elapsed;
                tweenData.progress = progress;
                tweenData.previous = tweenData.current;

                if (progress === 1)
                {
                    if (forward)
                    {
                        tweenData.current = tweenData.end;
                        target[tweenData.key] = tweenData.end;

                        if (tweenData.hold > 0)
                        {
                            tweenData.elapsed = tweenData.hold - diff;

                            tweenData.state = TWEEN_CONST.HOLD_DELAY;
                        }
                        else
                        {
                            tweenData.state = this.setStateFromEnd(tween, tweenData, diff);
                        }
                    }
                    else
                    {
                        tweenData.current = tweenData.start;
                        target[tweenData.key] = tweenData.start;

                        tweenData.state = this.setStateFromStart(tween, tweenData, diff);
                    }
                }
                else
                {
                    var v = (forward) ? tweenData.ease(progress) : tweenData.ease(1 - progress);

                    tweenData.current = tweenData.start + ((tweenData.end - tweenData.start) * v);

                    target[tweenData.key] = tweenData.current;
                }

                this.dispatchTweenDataEvent(Events.TWEEN_UPDATE, tween.callbacks.onUpdate, tweenData);

                break;

            case TWEEN_CONST.DELAY:

                tweenData.elapsed -= delta;

                if (tweenData.elapsed <= 0)
                {
                    tweenData.elapsed = Math.abs(tweenData.elapsed);

                    tweenData.state = TWEEN_CONST.PENDING_RENDER;
                }

                break;

            case TWEEN_CONST.REPEAT_DELAY:

                tweenData.elapsed -= delta;

                if (tweenData.elapsed <= 0)
                {
                    tweenData.elapsed = Math.abs(tweenData.elapsed);

                    tweenData.state = TWEEN_CONST.PLAYING_FORWARD;

                    this.dispatchTweenDataEvent(Events.TWEEN_REPEAT, tween.callbacks.onRepeat, tweenData);
                }

                break;

            case TWEEN_CONST.HOLD_DELAY:

                tweenData.elapsed -= delta;

                if (tweenData.elapsed <= 0)
                {
                    tweenData.state = this.setStateFromEnd(tween, tweenData, Math.abs(tweenData.elapsed));
                }

                break;

            case TWEEN_CONST.PENDING_RENDER:

                if (target)
                {
                    tweenData.start = tweenData.getStartValue(target, tweenData.key, target[tweenData.key], tweenData.index, tween.totalTargets, tween);

                    tweenData.end = tweenData.getEndValue(target, tweenData.key, tweenData.start, tweenData.index, tween.totalTargets, tween);

                    tweenData.current = tweenData.start;

                    target[tweenData.key] = tweenData.start;

                    tweenData.state = TWEEN_CONST.PLAYING_FORWARD;
                }
                else
                {
                    tweenData.state = TWEEN_CONST.COMPLETE;
                }

                break;
        }

        //  Return TRUE if this TweenData still playing, otherwise return FALSE
        return (tweenData.state !== TWEEN_CONST.COMPLETE);
    }

});

/**
 * Creates a new Tween object.
 *
 * Note: This method will only be available if Tweens have been built into Phaser.
 *
 * @method Phaser.GameObjects.GameObjectFactory#tween
 * @since 3.0.0
 *
 * @param {Phaser.Types.Tweens.TweenBuilderConfig|object} config - The Tween configuration.
 *
 * @return {Phaser.Tweens.Tween} The Tween that was created.
 */
GameObjectFactory.register('tween', function (config)
{
    return this.scene.sys.tweens.add(config);
});

/**
 * Creates a new Tween object and returns it.
 *
 * Note: This method will only be available if Tweens have been built into Phaser.
 *
 * @method Phaser.GameObjects.GameObjectCreator#tween
 * @since 3.0.0
 *
 * @param {Phaser.Types.Tweens.TweenBuilderConfig|object} config - The Tween configuration.
 *
 * @return {Phaser.Tweens.Tween} The Tween that was created.
 */
GameObjectCreator.register('tween', function (config)
{
    return this.scene.sys.tweens.create(config);
});

module.exports = Tween;
