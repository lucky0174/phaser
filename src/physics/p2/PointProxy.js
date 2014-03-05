/**
* @author       Richard Davey <rich@photonstorm.com>
* @copyright    2014 Photon Storm Ltd.
* @license      {@link https://github.com/photonstorm/phaser/blob/master/license.txt|MIT License}
*/

/**
* A PointProxy is an internal class that allows for direct getter/setter style property access to Arrays and TypedArrays.
*
* @class Phaser.Physics.P2.PointProxy
* @classdesc PointProxy
* @constructor
* @param {Phaser.Game} game - A reference to the Phaser.Game instance.
* @param {any} destination - The object to bind to.
*/
Phaser.Physics.P2.PointProxy = function (game, destination) {

    this.game = game;
	this.destination = destination;

};

Phaser.Physics.P2.PointProxy.prototype.constructor = Phaser.Physics.P2.PointProxy;

/**
* @name Phaser.Physics.P2.PointProxy#x
* @property {number} x - The x property of this PointProxy.
*/
Object.defineProperty(Phaser.Physics.P2.PointProxy.prototype, "x", {
    
    get: function () {

        return this.destination[0];

    },

    set: function (value) {

        this.destination[0] = this.game.math.px2p(value);

    }

});

/**
* @name Phaser.Physics.P2.PointProxy#y
* @property {number} y - The y property of this PointProxy.
*/
Object.defineProperty(Phaser.Physics.P2.PointProxy.prototype, "y", {
    
    get: function () {

        return this.destination[1];

    },

    set: function (value) {

        this.destination[1] = this.game.math.px2p(value);

    }

});
