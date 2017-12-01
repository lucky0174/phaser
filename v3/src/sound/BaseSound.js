var Class = require('../utils/Class');
var Extend = require('../utils/object/Extend');
var EventDispatcher = require('../events/EventDispatcher');
var NOOP = require('../utils/NOOP');
//  Phaser.Sound.BaseSound
var BaseSound = new Class({
    initialize: function BaseSound(manager, key, config) {
        /**
         * Local reference to the sound manager.
         *
         * @property {Phaser.Sound.BaseSoundManager} manager
         */
        this.manager = manager;
        /**
         * [description]
         *
         * @property {string} key
         */
        this.key = key;
        /**
         * [description]
         *
         * Duration set explicitly, rest of default values
         * will be set by other properties setters.
         *
         * @property {ISoundConfig} config
         */
        this.config = {};
        /**
         * Reference to the currently used config.
         * It could be default config or marker config.
         *
         * @property {ISoundConfig} currentConfig
         */
        this.currentConfig = this.config;
        /**
         * [description]
         *
         * @property {boolean} mute
         */
        this.mute = false;
        /**
         * [description]
         *
         * @property {number} volume
         */
        this.volume = 1;
        /**
         * Defines the speed at which the audio asset will be played.
         * Value of 1.0 plays the audio at full speed, 0.5 plays the audio
         * at half speed and 2.0 doubles the audio's playback speed.
         * This value gets multiplied by global rate to have the final playback speed.
         *
         * @property {number} rate
         */
        this.rate = 1;
        /**
         * Represents detuning of sound in [cents](https://en.wikipedia.org/wiki/Cent_%28music%29).
         * The range of the value is -1200 to 1200, but we recommend setting it to [50](https://en.wikipedia.org/wiki/50_Cent).
         *
         * Standards based Web Audio implementation only.
         * Webkit Web Audio implementation and HTML5 Audio don't support this.
         *
         * @property {number} detune
         */
        this.detune = 0;
        /**
         * A property that holds the value of sound's actual playback rate,
         * after its rate and detune values has been combined with global
         * rate and detune values.
         *
         * @property {number} totalRate
         */
        this.totalRate = 1;
        /**
         * [description]
         *
         * @property {number} seek
         */
        this.seek = 0;
        /**
         * [description]
         *
         * @property {boolean} loop
         */
        this.loop = false;
        /**
         * [description]
         *
         * @property {number} pan
         */
        this.pan = 0;
        this.config = Extend(this.config, config);
        /**
         * A value representing the duration, in seconds.
         * It could be total sound duration or a marker duration.
         *
         * @readonly
         * @property {number} duration
         */
        this.duration = 0;
        /**
         * Duration of the entire sound.
         *
         * @readonly
         * @property {number}
         */
        this.totalDuration = 0;
        /**
         * Flag indicating if sound is currently playing.
         *
         * @property {boolean} isPlaying
         */
        this.isPlaying = false;
        /**
         * Flag indicating if sound is currently paused.
         *
         * @property {boolean} isPaused
         */
        this.isPaused = false;
        /**
         * Object containing markers definitions.
         *
         * @property {{}} markers
         */
        this.markers = {};
        /**
         * Currently playing marker.
         * 'null' if whole sound is playing.
         *
         * @property {ISoundMarker} currentMarker
         */
        this.currentMarker = null;
        /**
         * [description]
         *
         * @property {Phaser.Tween}
         */
        this.fadeTween = null; // TODO see how to use global tween
        /**
         * Event dispatches used to handle all sound instance
         * relevant events.
         *
         * @property {Phaser.Events.EventDispatcher}
         */
        this.events = new EventDispatcher();
    },
    addMarker: function (marker) {
        if (!marker) {
            console.error('addMarker - Marker object has to be provided!');
            return false;
        }
        if (!marker.name || typeof marker.name !== 'string') {
            console.error('addMarker - Marker has to have a valid name!');
            return false;
        }
        if (this.markers[marker.name]) {
            console.error('addMarker - Marker with name \'' + marker.name + '\' already exists for sound \'' + this.key + '\'!');
            return false;
        }
        marker = Extend(true, {
            name: '',
            start: 0,
            duration: this.totalDuration,
            config: {
                mute: false,
                volume: 1,
                rate: 1,
                detune: 0,
                seek: 0,
                loop: false,
                pan: 0
            }
        }, marker);
        this.markers[marker.name] = marker;
        return true;
    },
    updateMarker: function (marker) {
        if (!marker) {
            console.error('updateMarker - Marker object has to be provided!');
            return false;
        }
        if (!marker.name || typeof marker.name !== 'string') {
            console.error('updateMarker - Marker has to have a valid name!');
            return false;
        }
        if (!this.markers[marker.name]) {
            console.error('updateMarker - Marker with name \'' + marker.name + '\' does not exist for sound \'' + this.key + '\'!');
            return false;
        }
        this.markers[marker.name] = Extend(true, this.markers[marker.name], marker);
        return true;
    },
    removeMarker: function (markerName) {
        var marker = this.markers[markerName];
        if (!marker) {
            console.error('removeMarker - Marker with name \'' + marker.name + '\' does not exist for sound \'' + this.key + '\'!');
            return null;
        }
        this.markers[markerName] = null;
        return marker;
    },
    play: function (markerName, config) {
        if (markerName === void 0) { markerName = ''; }
        if (typeof markerName === 'object') {
            config = markerName;
            markerName = '';
        }
        if (typeof markerName !== 'string') {
            console.error('Sound marker name has to be a string!');
            return null;
        }
        if (!markerName) {
            this.currentMarker = null;
            this.currentConfig = this.config;
            this.duration = this.totalDuration;
        }
        else {
            if (!this.markers[markerName]) {
                console.error('No marker with name \'' + markerName + '\' found for sound \'' + this.key + '\'!');
                return null;
            }
            this.currentMarker = this.markers[markerName];
            this.currentConfig = this.currentMarker.config;
            this.duration = this.currentMarker.duration;
        }
        this.currentConfig = Extend(this.currentConfig, config);
        this.isPlaying = true;
        this.isPaused = false;
        return this;
    },
    pause: function () {
        if (this.isPaused || !this.isPlaying) {
            return false;
        }
        this.isPlaying = false;
        this.isPaused = true;
        return true;
    },
    resume: function () {
        if (!this.isPaused || this.isPlaying) {
            return false;
        }
        this.isPlaying = true;
        this.isPaused = false;
        return true;
    },
    stop: function () {
        if (!this.isPaused && !this.isPlaying) {
            return false;
        }
        this.isPlaying = false;
        this.isPaused = false;
        return true;
    },
    /**
     * @private
     */
    applyConfig: function () {
        this.mute = this.currentConfig.mute;
        this.volume = this.currentConfig.volume;
        this.rate = this.currentConfig.rate;
        this.detune = this.currentConfig.detune;
        // TODO assign other config values to buffer source
    },
    fadeTo: function (volume, duration) {
        return null;
    },
    update: NOOP,
    destroy: function () {
    },
    /**
     * @private
     */
    setRate: function () {
        var cent = 1.0005777895065548; // Math.pow(2, 1/1200);
        var totalDetune = Math.max(-1200, Math.min(this.currentConfig.detune + this.manager.detune, 1200));
        var detuneRate = Math.pow(cent, totalDetune);
        this.totalRate = this.currentConfig.rate * this.manager.rate * detuneRate;
    }
});
module.exports = BaseSound;
