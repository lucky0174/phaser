/**
 * @author       Richard Davey <rich@photonstorm.com>
 * @copyright    2018 Photon Storm Ltd.
 * @license      {@link https://github.com/photonstorm/phaser/blob/master/license.txt|MIT License}
 */

var Class = require('../../../utils/Class');
var Earcut = require('../../../geom/polygon/Earcut');
var EllipseRender = require('./EllipseRender');
var GeomEllipse = require('../../../geom/ellipse/Ellipse');
var Shape = require('../Shape');

/**
 * @classdesc
 *
 * @class Ellipse
 * @extends Phaser.GameObjects.Shape
 * @memberOf Phaser.GameObjects
 * @constructor
 * @since 3.13.0
 *
 * @param {Phaser.Scene} scene - The Scene to which this Game Object belongs. A Game Object can only belong to one Scene at a time.
 * @param {number} [x=0] - The horizontal position of this Game Object in the world.
 * @param {number} [y=0] - The vertical position of this Game Object in the world.
 * @param {number} [width=128] - The width of the ellipse. An ellipse with equal width and height renders as a circle.
 * @param {number} [height=128] - The height of the ellipse. An ellipse with equal width and height renders as a circle.
 * @param {number} [fillColor] - The color the ellipse will be filled with, i.e. 0xff0000 for red.
 * @param {number} [fillAlpha] - The alpha the ellipse will be filled with. You can also set the alpha of the overall Shape using its `alpha` property.
 */
var Ellipse = new Class({

    Extends: Shape,

    Mixins: [
        EllipseRender
    ],

    initialize:

    function Ellipse (scene, x, y, width, height, fillColor, fillAlpha)
    {
        if (x === undefined) { x = 0; }
        if (y === undefined) { y = 0; }
        if (width === undefined) { width = 128; }
        if (height === undefined) { height = 128; }

        Shape.call(this, scene, 'Ellipse', new GeomEllipse(width / 2, height / 2, width, height));

        /**
         * Private internal value.
         * The number of points used to draw the curve. Higher values create smoother renders at the cost of more triangles being drawn.
         *
         * @name Phaser.GameObjects.Ellipse#_smoothness
         * @type {integer}
         * @private
         * @since 3.13.0
         */
        this._smoothness = 64;

        this.setPosition(x, y);
        this.setSize(width, height);

        if (fillColor !== undefined)
        {
            this.setFillStyle(fillColor, fillAlpha);
        }

        this.updateDisplayOrigin();
        this.updateData();
    },

    /**
     * The smoothness of the ellipse. The number of points used when rendering it.
     * Increase this value for a smoother ellipse, at the cost of more polygons being rendered.
     *
     * @name Phaser.GameObjects.Ellipse#smoothness
     * @type {integer}
     * @default 64
     * @since 3.13.0
     */
    smoothness: {

        get: function ()
        {
            return this._smoothness;
        },

        set: function (value)
        {
            this._smoothness = value;

            this.updateData();
        }

    },

    /**
     * Sets the smoothness of the ellipse. The number of points used when rendering it.
     * Increase this value for a smoother ellipse, at the cost of more polygons being rendered.
     * This call can be chained.
     *
     * @method Phaser.GameObjects.Ellipse#setSmoothness
     * @since 3.13.0
     * 
     * @param {integer} value - The value to set the smoothness to.
     *
     * @return {this} This Game Object instance.
     */
    setSmoothness: function (value)
    {
        this._smoothness = value;

        return this.updateData();
    },

    /**
     * Internal method that updates the data and path values.
     *
     * @method Phaser.GameObjects.Ellipse#updateData
     * @private
     * @since 3.13.0
     *
     * @return {this} This Game Object instance.
     */
    updateData: function ()
    {
        var path = [];
        var points = this.data.getPoints(this._smoothness);

        for (var i = 0; i < points.length; i++)
        {
            path.push(points[i].x, points[i].y);
        }

        path.push(points[0].x, points[0].y);

        this.pathIndexes = Earcut(path);
        this.pathData = path;

        return this;
    }

});

module.exports = Ellipse;
