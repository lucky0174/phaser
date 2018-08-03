/**
 * @author       Richard Davey <rich@photonstorm.com>
 * @copyright    2018 Photon Storm Ltd.
 * @license      {@link https://github.com/photonstorm/phaser/blob/master/license.txt|MIT License}
 */

/**
 * Renders this Game Object with the Canvas Renderer to the given Camera.
 * The object will not render if any of its renderFlags are set or it is being actively filtered out by the Camera.
 * This method should not be called directly. It is a utility function of the Render module.
 *
 * @method Phaser.GameObjects.RenderTexture#renderCanvas
 * @since 3.2.0
 * @private
 *
 * @param {Phaser.Renderer.Canvas.CanvasRenderer} renderer - A reference to the current active Canvas renderer.
 * @param {Phaser.GameObjects.RenderTexture} renderTexture - The Game Object being rendered in this call.
 * @param {number} interpolationPercentage - Reserved for future use and custom pipelines.
 * @param {Phaser.Cameras.Scene2D.Camera} camera - The Camera that is rendering the Game Object.
 * @param {Phaser.GameObjects.Components.TransformMatrix} parentMatrix - This transform matrix is defined if the game object is nested
 */
var RenderTextureCanvasRenderer = function (renderer, renderTexture, interpolationPercentage, camera, parentMatrix)
{
    var ctx = renderer.currentContext;

    //  Alpha

    var alpha = camera.alpha * renderTexture.alpha;

    if (alpha === 0)
    {
        //  Nothing to see, so abort early
        return;
    }

    var dx = 0;
    var dy = 0;

    var fx = 1;
    var fy = 1;

    if (renderTexture.flipX)
    {
        fx = -1;
        dx -= renderTexture.canvas.width - renderTexture.displayOriginX;
    }
    else
    {
        dx -= renderTexture.displayOriginX;
    }

    if (renderTexture.flipY)
    {
        fy = -1;
        dy -= renderTexture.canvas.height - renderTexture.displayOriginY;
    }
    else
    {
        dy -= renderTexture.displayOriginY;
    }

    ctx.save();

    //  Blend Mode
    ctx.globalCompositeOperation = renderer.blendModes[renderTexture.blendMode];

    //  Alpha
    ctx.globalAlpha = alpha;

    if (parentMatrix)
    {
        parentMatrix.copyToContext(ctx);
    }

    ctx.translate(renderTexture.x - camera.scrollX * renderTexture.scrollFactorX, renderTexture.y - camera.scrollY * renderTexture.scrollFactorY);
    ctx.rotate(renderTexture.rotation);
    ctx.scale(renderTexture.scaleX, renderTexture.scaleY);
    ctx.scale(fx, fy);
    ctx.drawImage(renderTexture.canvas, dx, dy);

    ctx.restore();
};

module.exports = RenderTextureCanvasRenderer;
