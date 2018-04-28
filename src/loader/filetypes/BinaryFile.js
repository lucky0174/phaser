/**
 * @author       Richard Davey <rich@photonstorm.com>
 * @copyright    2018 Photon Storm Ltd.
 * @license      {@link https://github.com/photonstorm/phaser/blob/master/license.txt|MIT License}
 */

var Class = require('../../utils/Class');
var CONST = require('../const');
var File = require('../File');
var FileTypesManager = require('../FileTypesManager');
var GetFastValue = require('../../utils/object/GetFastValue');
var IsPlainObject = require('../../utils/object/IsPlainObject');

/**
 * @classdesc
 * [description]
 *
 * @class BinaryFile
 * @extends Phaser.Loader.File
 * @memberOf Phaser.Loader.FileTypes
 * @constructor
 * @since 3.0.0
 *
 * @param {string} key - [description]
 * @param {string} url - [description]
 * @param {string} path - [description]
 * @param {XHRSettingsObject} [xhrSettings] - [description]
 */
var BinaryFile = new Class({

    Extends: File,

    initialize:

    function BinaryFile (loader, key, url, xhrSettings)
    {
        var extension = 'bin';

        if (IsPlainObject(key))
        {
            var config = key;

            key = GetFastValue(config, 'key');
            url = GetFastValue(config, 'url');
            xhrSettings = GetFastValue(config, 'xhrSettings');
            extension = GetFastValue(config, 'extension', extension);
        }

        var fileConfig = {
            type: 'binary',
            cache: loader.cacheManager.binary,
            extension: extension,
            responseType: 'arraybuffer',
            key: key,
            url: url,
            path: loader.path,
            xhrSettings: xhrSettings
        };

        File.call(this, loader, fileConfig);
    },

    onProcess: function (callback)
    {
        this.state = CONST.FILE_PROCESSING;

        this.data = this.xhrLoader.response;

        this.onComplete();

        callback(this);
    }

});

/**
 * Adds Binary file to the current load queue.
 *
 * Note: This method will only be available if the Binary File type has been built into Phaser.
 *
 * The file is **not** loaded immediately after calling this method.
 * Instead, the file is added to a queue within the Loader, which is processed automatically when the Loader starts.
 *
 * @method Phaser.Loader.LoaderPlugin#binary
 * @since 3.0.0
 *
 * @param {string} key - [description]
 * @param {string} url - [description]
 * @param {XHRSettingsObject} [xhrSettings] - [description]
 *
 * @return {Phaser.Loader.LoaderPlugin} The Loader.
 */
FileTypesManager.register('binary', function (key, url, xhrSettings)
{
    if (Array.isArray(key))
    {
        for (var i = 0; i < key.length; i++)
        {
            //  If it's an array it has to be an array of Objects, so we get everything out of the 'key' object
            this.addFile(new BinaryFile(this, key[i], url, xhrSettings));
        }
    }
    else
    {
        this.addFile(new BinaryFile(this, key, url, xhrSettings));
    }

    //  For method chaining
    return this;
});

module.exports = BinaryFile;
