/**
 * @author       Richard Davey <rich@photonstorm.com>
 * @copyright    2019 Photon Storm Ltd.
 * @license      {@link https://github.com/photonstorm/phaser/blob/master/license.txt|MIT License}
 */

var CONST = require('./const');
var IntersectsRect = require('./IntersectsRect');

var CollisionInfo = {

    check: function (data, body1, body2, overlapOnly, bias)
    {
        if (overlapOnly === undefined) { overlapOnly = false; }
        if (bias === undefined) { bias = 0; }

        if (data)
        {
            body1 = data.body1;
            body2 = data.body2;
        }

        var overlapX = 0;
        var overlapY = 0;

        // var maxOverlap = body1.deltaAbsY() + body2.deltaAbsY() + bias;
    
        var distanceX1 = body1.right - body2.x;
        var distanceX2 = body2.right - body1.x;
    
        var prevDistanceX1 = (body1.prev.x + body1.width) - body2.prev.x;
        var prevDistanceX2 = (body2.prev.x + body2.width) - body1.prev.x;

        var distanceY1 = body1.bottom - body2.y;
        var distanceY2 = body2.bottom - body1.y;
    
        var prevDistanceY1 = (body1.prev.y + body1.height) - body2.prev.y;
        var prevDistanceY2 = (body2.prev.y + body2.height) - body1.prev.y;
   
        var leftFace = (distanceX1 > distanceX2 && prevDistanceX1 > prevDistanceX2);
        var topFace = (distanceY1 > distanceY2 && prevDistanceY1 > prevDistanceY2);
   
        var faceX = CONST.FACING_NONE;
        var faceY = CONST.FACING_NONE;

        var intersects = IntersectsRect(body1, body2, 0);
        var touching = (intersects) ? true : IntersectsRect(body1, body2, 1);

        var intersectsX = intersects;
        var intersectsY = intersects;

        var share = 0;
        var shareX1 = 0;
        var shareX2 = 0;
        var shareY1 = 0;
        var shareY2 = 0;
   
        if (leftFace)
        {
            faceX = CONST.FACING_LEFT;

            //  body1 left is touching body2 right
            if (intersectsX && body1.checkCollision.left && body2.checkCollision.right)
            {
                overlapX = distanceX2;

                share = overlapX * 0.5;

                if (!body1.immovable)
                {
                    shareX1 = body1.getMoveX(share);
                }

                if (shareX1 < share)
                {
                    share += (share - shareX1);
                }

                if (!body2.immovable)
                {
                    shareX2 = body2.getMoveX(-share);
                }
            }
            else
            {
                intersectsX = false;
            }
        }
        else
        {
            faceX = CONST.FACING_RIGHT;

            //  body1 right is touching body2 left
            if (intersectsX && body1.checkCollision.right && body2.checkCollision.left)
            {
                overlapX = distanceX1;

                share = overlapX * 0.5;

                if (!body2.immovable)
                {
                    shareX2 = body2.getMoveX(share);
                }

                if (shareX2 < share)
                {
                    share += (share - shareX2);
                }
    
                if (!body1.immovable)
                {
                    shareX1 = body1.getMoveX(-share);
                }
            }
            else
            {
                intersectsX = false;
            }
        }

        if (topFace)
        {
            faceY = CONST.FACING_UP;

            //  body1 top is touching body2 bottom
            if (intersectsY && body1.checkCollision.up && body2.checkCollision.down)
            {
                overlapY = distanceY2;

                share = overlapY * 0.5;

                if (!body1.immovable)
                {
                    shareY1 = body1.getMoveY(share);
                }

                if (shareY1 < share)
                {
                    share += (share - shareY1);
                }

                if (!body2.immovable)
                {
                    shareY2 = body2.getMoveY(-share);
                }
            }
            else
            {
                intersectsY = false;
            }
        }
        else
        {
            faceY = CONST.FACING_DOWN;

            //  body1 bottom is touching body2 top
            if (intersectsY && body1.checkCollision.down && body2.checkCollision.up)
            {
                overlapY = distanceY1;

                share = overlapY * 0.5;

                if (!body2.immovable)
                {
                    shareY2 = body2.getMoveY(share);
                }

                if (shareY2 < share)
                {
                    share += (share - shareY2);
                }
    
                if (!body1.immovable)
                {
                    shareY1 = body1.getMoveY(-share);
                }
            }
            else
            {
                intersectsY = false;
            }
        }

        var face = (overlapX < overlapY) ? faceX : faceY;

        if (data)
        {
            data.intersects = (intersectsX || intersectsY);
            data.touching = touching;
            data.overlapOnly = overlapOnly;
            data.overlapX = overlapX;
            data.overlapY = overlapY;
            data.face = face;
            data.faceX = faceX;
            data.faceY = faceY;
            data.set = false;
            data.shareX1 = shareX1;
            data.shareX2 = shareX2;
            data.shareY1 = shareY1;
            data.shareY2 = shareY2;

            return data;
        }
        else
        {
            return {
                body1: body1,
                body2: body2,
                intersects: (intersectsX || intersectsY),
                touching: touching,
                overlapOnly: overlapOnly,
                overlapX: overlapX,
                overlapY: overlapY,
                face: face,
                faceX: faceX,
                faceY: faceY,
                set: false,
                shareX1: shareX1,
                shareX2: shareX2,
                shareY1: shareY1,
                shareY2: shareY2
            };
        }
    },

    get: function (body1, body2, overlapOnly, bias)
    {
        var blockers = body1.blockers;

        for (var i = 0; i < blockers.length; i++)
        {
            var data = blockers[i];

            if (data.body1 === body1 && data.body2 === body2)
            {
                this.check(data);

                return data;
            }
        }

        return this.check(null, body1, body2, overlapOnly, bias);
    },

    create: function (body1, body2, overlapOnly, bias)
    {
        return this.check(null, body1, body2, overlapOnly, bias);
    },

    update: function (collisionInfo)
    {
        return this.check(collisionInfo);
    }

};

module.exports = CollisionInfo;
