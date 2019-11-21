/**
 * @author       Richard Davey <rich@photonstorm.com>
 * @copyright    2019 Photon Storm Ltd.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */

/**
 * Calculate the position, width and height of a BitmapText Game Object.
 *
 * Returns a BitmapTextSize object that contains global and local variants of the Game Objects x and y coordinates and
 * its width and height.
 *
 * The global position and size take into account the Game Object's position and scale.
 *
 * The local position and size just takes into account the font data.
 *
 * @function GetBitmapTextSize
 * @since 3.0.0
 * @private
 *
 * @param {(Phaser.GameObjects.DynamicBitmapText|Phaser.GameObjects.BitmapText)} src - The BitmapText to calculate the position, width and height of.
 * @param {boolean} [round] - Whether to round the results to the nearest integer.
 * @param {object} [out] - Optional object to store the results in, to save constant object creation.
 *
 * @return {Phaser.Types.GameObjects.BitmapText.BitmapTextSize} The calculated position, width and height of the BitmapText.
 */
var GetBitmapTextSize = function (src, round, out)
{
    if (out === undefined)
    {
        out = {
            local: {
                x: 0,
                y: 0,
                width: 0,
                height: 0
            },
            global: {
                x: 0,
                y: 0,
                width: 0,
                height: 0
            },
            lines: {
                shortest: 0,
                longest: 0,
                lengths: null,
                height: 0
            },
            words: [],
            maxWidth: 0
        };
    }

    var text = src.text;
    var textLength = text.length;
    var maxWidth = src.maxWidth;

    var bx = Number.MAX_VALUE;
    var by = Number.MAX_VALUE;
    var bw = 0;
    var bh = 0;

    var chars = src.fontData.chars;
    var lineHeight = src.fontData.lineHeight;
    var letterSpacing = src.letterSpacing;

    out.lines.height = lineHeight;

    var xAdvance = 0;
    var yAdvance = 0;

    var charCode = 0;

    var glyph = null;

    var x = 0;
    var y = 0;

    var scale = (src.fontSize / src.fontData.size);
    var sx = scale * src.scaleX;
    var sy = scale * src.scaleY;

    var lastGlyph = null;
    var lastCharCode = 0;
    var lineWidths = [];
    var shortestLine = Number.MAX_VALUE;
    var longestLine = 0;
    var currentLine = 0;
    var currentLineWidth = 0;

    var words = [];
    var current = null;

    //  Scan for breach of maxWidth and insert carriage-returns
    if (maxWidth > 0 && out.maxWidth !== maxWidth)
    {
        for (var i = 0; i < textLength; i++)
        {
            charCode = text.charCodeAt(i);

            if (charCode === 10)
            {
                if (current !== null)
                {
                    //  This time it doesn't include the scale x/y modifiers,
                    //  as we're comparing against an unscaled pixel value.
                    words.push({
                        word: current.word,
                        i: current.i,
                        x: current.x,
                        y: current.y,
                        w: current.w,
                        h: current.h
                    });

                    current = null;
                }

                xAdvance = 0;
                yAdvance += lineHeight;
                lastGlyph = null;

                continue;
            }

            glyph = chars[charCode];

            if (!glyph)
            {
                continue;
            }

            if (lastGlyph !== null)
            {
                var glyphKerningOffset = glyph.kerning[lastCharCode];
            }

            if (charCode === 32)
            {
                if (current !== null)
                {
                    words.push({
                        word: current.word,
                        i: current.i,
                        x: current.x,
                        y: current.y,
                        w: current.w,
                        h: current.h
                    });
    
                    current = null;
                }
            }
            else
            {
                if (current === null)
                {
                    //  We're starting a new word, recording the starting index, etc
                    current = { word: '', i: i, x: xAdvance, y: yAdvance, w: 0, h: lineHeight };
                }

                current.word = current.word.concat(text[i]);
                current.w += glyph.xOffset + glyph.xAdvance + ((glyphKerningOffset !== undefined) ? glyphKerningOffset : 0);
            }

            xAdvance += glyph.xAdvance + letterSpacing;
            lastGlyph = glyph;
            lastCharCode = charCode;
        }

        //  Last word
        if (current !== null)
        {
            words.push({
                word: current.word,
                i: current.i,
                x: current.x,
                y: current.y,
                w: current.w,
                h: current.h
            });
        }

        //  Reset for the next loop
        xAdvance = 0;
        yAdvance = 0;
        lastGlyph = null;
        lastCharCode = 0;

        //  Loop through the words array and see if we've got any > maxWidth
        console.log('maxWidth words array');
        console.log(words);

        var offset = 0;
        var line = 0;
        var crs = [];

        for (i = 0; i < words.length; i++)
        {
            var entry = words[i];
            var checkX = (entry.x - line - offset) + entry.w;

            console.log(entry.word, '=', checkX);

            if (checkX > maxWidth)
            {
                //  CR needed
                console.log('CR needed before', entry.word);

                crs.push({ word: entry.word, index: entry.i - 1 });

                offset = entry.w;
                line += maxWidth;
            }
        }

        var stringInsert = function (str, index, value)
        {
            return str.substr(0, index) + value + str.substr(index);
        };

        for (i = crs.length - 1; i >= 0; i--)
        {
            console.log('injecting at', crs[i]);

            // eslint-disable-next-line quotes
            text = stringInsert(text, crs[i].index, "\n");
        }

        console.log(text);

        out.maxWidth = maxWidth;

        src._text = text;
        textLength = text.length;

        //  Recalculated in the next loop
        words = [];
        current = { word: '', x: 0, y: 0, w: 0, h: lineHeight };
    }
    else
    {
        current = { word: '', x: 0, y: 0, w: 0, h: lineHeight };
    }

    //  TODO: Needs modifying to use the current = null approach above

    for (i = 0; i < textLength; i++)
    {
        charCode = text.charCodeAt(i);

        if (charCode === 10)
        {
            words.push({
                word: current.word,
                x: current.x * sx,
                y: current.y * sy,
                w: current.w * sx,
                h: current.h * sy
            });

            xAdvance = 0;
            yAdvance += lineHeight;
            lastGlyph = null;

            current = { word: '', x: xAdvance, y: yAdvance, w: 0, h: lineHeight };

            lineWidths[currentLine] = currentLineWidth;

            if (currentLineWidth > longestLine)
            {
                longestLine = currentLineWidth;
            }

            if (currentLineWidth < shortestLine)
            {
                shortestLine = currentLineWidth;
            }

            currentLine++;
            currentLineWidth = 0;
            continue;
        }

        glyph = chars[charCode];

        if (!glyph)
        {
            continue;
        }

        x = xAdvance;
        y = yAdvance;

        if (lastGlyph !== null)
        {
            var kerningOffset = glyph.kerning[lastCharCode];
            x += (kerningOffset !== undefined) ? kerningOffset : 0;
        }

        if (bx > x)
        {
            bx = x;
        }

        if (by > y)
        {
            by = y;
        }

        var gw = x + glyph.xAdvance;
        var gh = y + lineHeight;

        if (bw < gw)
        {
            bw = gw;
        }

        if (bh < gh)
        {
            bh = gh;
        }

        xAdvance += glyph.xAdvance + letterSpacing;
        lastGlyph = glyph;
        lastCharCode = charCode;
        currentLineWidth = gw * scale;

        if (charCode === 32)
        {
            words.push({
                word: current.word,
                x: current.x * sx,
                y: current.y * sy,
                w: current.w * sx,
                h: current.h * sy
            });

            current = { word: '', x: xAdvance, y: yAdvance, w: 0, h: lineHeight };
        }
        else
        {
            current.word = current.word.concat(text[i]);
            current.w += glyph.xOffset + glyph.xAdvance + ((kerningOffset !== undefined) ? kerningOffset : 0);
        }
    }

    //  Last word
    if (current !== null)
    {
        words.push({
            word: current.word,
            x: current.x * sx,
            y: current.y * sy,
            w: current.w * sx,
            h: current.h * sy
        });
    }

    lineWidths[currentLine] = currentLineWidth;

    if (currentLineWidth > longestLine)
    {
        longestLine = currentLineWidth;
    }

    if (currentLineWidth < shortestLine)
    {
        shortestLine = currentLineWidth;
    }

    var local = out.local;
    var global = out.global;
    var lines = out.lines;

    local.x = bx * scale;
    local.y = by * scale;
    local.width = bw * scale;
    local.height = bh * scale;

    global.x = (src.x - src.displayOriginX) + (bx * sx);
    global.y = (src.y - src.displayOriginY) + (by * sy);
    global.width = bw * sx;
    global.height = bh * sy;

    lines.shortest = shortestLine;
    lines.longest = longestLine;
    lines.lengths = lineWidths;

    if (round)
    {
        local.x = Math.round(local.x);
        local.y = Math.round(local.y);
        local.width = Math.round(local.width);
        local.height = Math.round(local.height);

        global.x = Math.round(global.x);
        global.y = Math.round(global.y);
        global.width = Math.round(global.width);
        global.height = Math.round(global.height);

        lines.shortest = Math.round(shortestLine);
        lines.longest = Math.round(longestLine);
    }

    out.words = words;

    return out;
};

module.exports = GetBitmapTextSize;
