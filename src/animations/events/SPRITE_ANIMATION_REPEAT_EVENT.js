/**
 * The Sprite Animation Repeat Event.
 * 
 * This event is dispatched by a Sprite when an animation repeats playing on it.
 * 
 * Listen for it on the Sprite using `sprite.on('animationrepeat', listener)`
 * 
 * This same event is dispatched for all animations. To listen for a specific animation, use the `SPRITE_REPEAT_KEY_ANIMATION_EVENT` event.
 *
 * @event Phaser.Animations.Events#SPRITE_ANIMATION_REPEAT
 * 
 * @param {Phaser.Animations.Animation} animation - A reference to the Animation that is repeating on the Sprite.
 * @param {Phaser.Animations.AnimationFrame} frame - The current Animation Frame that the Animation started with.
 * @param {integer} repeatCount - The number of times the Animation has repeated so far.
 * @param {Phaser.GameObjects.Sprite} gameObject - A reference to the Game Object on which the animation repeated playing.
 */
module.exports = 'animationrepeat';
