/**
 * @author       Richard Davey <rich@photonstorm.com>
 * @author       Felipe Alfonso <@bitnenfer>
 * @copyright    2020 Photon Storm Ltd.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */

var Class = require('../../../utils/Class');
var GetFastValue = require('../../../utils/object/GetFastValue');
var ShaderSourceFS = require('../shaders/BitmapMask-frag.js');
var ShaderSourceVS = require('../shaders/BitmapMask-vert.js');
var WebGLPipeline = require('../WebGLPipeline');

/**
 * @classdesc
 *
 *
 *
 * BitmapMaskPipeline handles all bitmap masking rendering in WebGL. It works by using
 * sampling two texture on the fragment shader and using the fragment's alpha to clip the region.
 *
 * @class BitmapMaskPipeline
 * @extends Phaser.Renderer.WebGL.WebGLPipeline
 * @memberof Phaser.Renderer.WebGL.Pipelines
 * @constructor
 * @since 3.0.0
 *
 * @param {Phaser.Types.Renderer.WebGL.WebGLPipelineConfig} config - The configuration options for this pipeline.
 */
var BitmapMaskPipeline = new Class({

    Extends: WebGLPipeline,

    initialize:

    function BitmapMaskPipeline (config)
    {
        config.fragShader = GetFastValue(config, 'fragShader', ShaderSourceFS),
        config.vertShader = GetFastValue(config, 'vertShader', ShaderSourceVS),
        config.vertexSize = GetFastValue(config, 'vertexSize', 8),
        config.vertexCapacity = GetFastValue(config, 'vertexCapacity', 3),
        config.vertices = GetFastValue(config, 'vertices', new Float32Array([ -1, 1, -1, -7, 7, 1 ]).buffer),
        config.attributes = GetFastValue(config, 'attributes', [
            {
                name: 'inPosition',
                size: 2,
                type: config.game.renderer.gl.FLOAT,
                normalized: false,
                offset: 0,
                enabled: false,
                location: -1
            }
        ]);

        WebGLPipeline.call(this, config);

        /**
         * Float32 view of the array buffer containing the pipeline's vertices.
         *
         * @name Phaser.Renderer.WebGL.Pipelines.BitmapMaskPipeline#vertexViewF32
         * @type {Float32Array}
         * @since 3.0.0
         */
        // this.vertexViewF32 = new Float32Array(this.vertexData);

        /**
         * Dirty flag to check if resolution properties need to be updated on the
         * masking shader.
         *
         * @name Phaser.Renderer.WebGL.Pipelines.BitmapMaskPipeline#resolutionDirty
         * @type {boolean}
         * @default true
         * @since 3.0.0
         */
        // this.resolutionDirty = true;
    },

    /**
     * Called every time the pipeline needs to be used.
     * It binds all necessary resources.
     *
     * @method Phaser.Renderer.WebGL.Pipelines.BitmapMaskPipeline#onBind
     * @since 3.0.0
     *
     * @return {this} This WebGLPipeline instance.
    onBind: function ()
    {
        WebGLPipeline.prototype.onBind.call(this);

        var renderer = this.renderer;
        var program = this.program;

        if (this.resolutionDirty)
        {
            renderer.setFloat2(program, 'uResolution', this.width, this.height);
            renderer.setInt1(program, 'uMainSampler', 0);
            renderer.setInt1(program, 'uMaskSampler', 1);
            this.resolutionDirty = false;
        }

        return this;
    },
    */

    /**
     * Called every time the pipeline is bound by the renderer.
     * Sets the shader program, vertex buffer and other resources.
     * Should only be called when changing pipeline.
     *
     * @method Phaser.Renderer.WebGL.Pipelines.BitmapMaskPipeline#bind
     * @since 3.50.0
     *
     * @param {boolean} [reset=false] - Should the pipeline be fully re-bound after a renderer pipeline clear?
     *
     * @return {this} This WebGLPipeline instance.
     */
    bind: function (reset)
    {
        if (reset === undefined) { reset = false; }

        WebGLPipeline.prototype.bind.call(this, reset);

        var renderer = this.renderer;
        var program = this.program;

        renderer.setFloat2(program, 'uResolution', this.width, this.height);
        renderer.setInt1(program, 'uMainSampler', 0);
        renderer.setInt1(program, 'uMaskSampler', 1);

        return this;
    },

    /**
     * Resizes this pipeline and updates the projection.
     *
     * @method Phaser.Renderer.WebGL.Pipelines.BitmapMaskPipeline#resize
     * @since 3.0.0
     *
     * @param {number} width - The new width.
     * @param {number} height - The new height.
     * @param {number} resolution - The resolution.
     *
     * @return {this} This WebGLPipeline instance.
     */
    resize: function (width, height, resolution)
    {
        WebGLPipeline.prototype.resize.call(this, width, height, resolution);

        this.resolutionDirty = true;

        return this;
    },

    /**
     * Binds necessary resources and renders the mask to a separated framebuffer.
     * The framebuffer for the masked object is also bound for further use.
     *
     * @method Phaser.Renderer.WebGL.Pipelines.BitmapMaskPipeline#beginMask
     * @since 3.0.0
     *
     * @param {Phaser.GameObjects.GameObject} mask - GameObject used as mask.
     * @param {Phaser.GameObjects.GameObject} maskedObject - GameObject masked by the mask GameObject.
     * @param {Phaser.Cameras.Scene2D.Camera} camera - The camera rendering the current mask.
     */
    beginMask: function (mask, maskedObject, camera)
    {
        var renderer = this.renderer;
        var gl = this.gl;

        //  The renderable Game Object that is being used for the bitmap mask
        var bitmapMask = mask.bitmapMask;

        if (bitmapMask && gl)
        {
            renderer.flush();

            mask.prevFramebuffer = renderer.currentFramebuffer;

            renderer.setFramebuffer(mask.mainFramebuffer);

            gl.disable(gl.STENCIL_TEST);

            gl.clearColor(0, 0, 0, 0);

            gl.clear(gl.COLOR_BUFFER_BIT);

            if (renderer.currentCameraMask.mask !== mask)
            {
                renderer.currentMask.mask = mask;
                renderer.currentMask.camera = camera;
            }
        }
    },

    /**
     * The masked game objects framebuffer is unbound and its texture
     * is bound together with the mask texture and the mask shader and
     * a draw call with a single quad is processed. Here is where the
     * masking effect is applied.
     *
     * @method Phaser.Renderer.WebGL.Pipelines.BitmapMaskPipeline#endMask
     * @since 3.0.0
     *
     * @param {Phaser.GameObjects.GameObject} mask - GameObject used as a mask.
     */
    endMask: function (mask, camera)
    {
        var gl = this.gl;
        var renderer = this.renderer;

        //  The renderable Game Object that is being used for the bitmap mask
        var bitmapMask = mask.bitmapMask;

        if (bitmapMask && gl)
        {
            renderer.flush();

            //  First we draw the mask to the mask fb
            renderer.setFramebuffer(mask.maskFramebuffer);

            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);

            renderer.setBlendMode(0, true);

            bitmapMask.renderWebGL(renderer, bitmapMask, 0, camera);

            renderer.flush();

            renderer.setFramebuffer(mask.prevFramebuffer);

            //  Is there a stencil further up the stack?
            var prev = renderer.getCurrentStencilMask();

            if (prev)
            {
                gl.enable(gl.STENCIL_TEST);

                prev.mask.applyStencil(renderer, prev.camera, true);
            }
            else
            {
                renderer.currentMask.mask = null;
            }

            //  Bind bitmap mask pipeline and draw
            renderer.setPipeline(this);

            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, mask.maskTexture);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, mask.mainTexture);

            gl.uniform1i(gl.getUniformLocation(this.program, 'uInvertMaskAlpha'), mask.invertAlpha);

            //  Finally, draw a triangle filling the whole screen
            gl.drawArrays(this.topology, 0, 3);
        }
    }

});

module.exports = BitmapMaskPipeline;
