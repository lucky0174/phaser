var TWEEN_CONST = require('../const');

var NextState = function ()
{
    if (this.loopCounter > 0)
    {
        this.resetTweenData(true);

        this.elapsed = 0;
        this.progress = 0;
        this.loopCounter--;

        if (this.loopDelay > 0)
        {
            this.countdown = this.loopDelay;
            this.state = TWEEN_CONST.LOOP_DELAY;
        }
        else
        {
            this.state = TWEEN_CONST.ACTIVE;
        }
    }
    else if (this.completeDelay > 0)
    {
        this.countdown = this.completeDelay;
        this.state = TWEEN_CONST.COMPLETE_DELAY;
    }
    else
    {
        this.state = TWEEN_CONST.PENDING_REMOVE;
    }
};

module.exports = NextState;
