/*jshint node:true, laxcomma:true*/
'use strict';

var spawn = require('child_process').spawn;


function legacyTag(key) { return key.match(/^TAG:/); }
function legacyDisposition(key) { return key.match(/^DISPOSITION:/); }

function parseFfprobeOutput(out) {
  var lines = out.split(/\r\n|\r|\n/);

  lines = lines.filter(function (line) {
    return line.length > 0;
  });

  var data = {
    streams: [],
    format: {},
    chapters: []
  };

  function parseBlock(name) {
    var data = {};

    var line = lines.shift();
    while (typeof line !== 'undefined') {
      if (line.toLowerCase() == '[/'+name+']') {
        return data;
      } else if (line.match(/^\[/)) {
        line = lines.shift();
        continue;
      }

      var kv = line.match(/^([^=]+)=(.*)$/);
      if (kv) {
        if (!(kv[1].match(/^TAG:/)) && kv[2].match(/^[0-9]+(\.[0-9]+)?$/)) {
          data[kv[1]] = Number(kv[2]);
        } else {
          data[kv[1]] = kv[2];
        }
      }

      line = lines.shift();
    }

    return data;
  }

  var line = lines.shift();
  while (typeof line !== 'undefined') {
    if (line.match(/^\[stream/i)) {
      var stream = parseBlock('stream');
      data.streams.push(stream);
    } else if (line.match(/^\[chapter/i)) {
      var chapter = parseBlock('chapter');
      data.chapters.push(chapter);
    } else if (line.toLowerCase() === '[format]') {
      data.format = parseBlock('format');
    }

    line = lines.shift();
  }

  return data;
}



module.exports = function(proto) {
  /**
   * A callback passed to the {@link FfmpegCommand#ffprobe} method.
   *
   * @callback FfmpegCommand~ffprobeCallback
   *
   * @param {Error|null} err error object or null if no error happened
   * @param {Object} ffprobeData ffprobe metadata with legacy value conversion;
   *   stream, format and chapter categories correspond to:
   *
   *     `ffprobe -print_format json -show_streams -show_format -show_chapters INPUTFILE`
   * @param {Array} ffprobeData.streams stream information
   * @param {Object} ffprobeData.format format information
   * @param {Array} ffprobeData.chapters chapter information and tags
   */

  /**
   * Run ffprobe on last specified input
   *
   * @method FfmpegCommand#ffprobe
   * @category Metadata
   *
   * @param {?Number} [index] 0-based index of input to probe (defaults to last input)
   * @param {?String[]} [options] array of output options to return
   * @param {FfmpegCommand~ffprobeCallback} callback callback function
   *
   */
  proto.ffprobe = function() {
    return probe.call(this, false, arguments);
  };

  /**
   * Run ffprobe and return its native JSON output, including nested side data.
   * Native JSON value types are retained instead of applying legacy conversion.
   * Options and input selection match {@link FfmpegCommand#ffprobe}; the JSON
   * writer is enforced after caller options. Streams are consumed when probed.
   *
   * @method FfmpegCommand#ffprobeJSON
   * @category Metadata
   * @param {?Number} [index] input index (defaults to last input)
   * @param {?String[]} [options] ffprobe options, such as ['-show_programs']
   * @param {Function} callback callback with signature (err, metadata)
   */
  proto.ffprobeJSON = function() {
    return probe.call(this, true, arguments);
  };

  function probe(useJSON, args) {
    var input, index = null, options = [];

    // the last argument should be the callback
    var callback = args[args.length - 1];

    var ended = false
    function handleCallback(err, data) {
      if (!ended) {
        ended = true;
        callback(err, data);
      }
    };

    // map the arguments to the correct variable names
    switch (args.length) {
      case 3:
        index = args[0];
        options = args[1];
        break;
      case 2:
        if (typeof args[0] === 'number') {
          index = args[0];
        } else if (Array.isArray(args[0])) {
          options = args[0];
        }
        break;
    }


    if (index === null) {
      if (!this._currentInput) {
        return handleCallback(new Error('No input specified'));
      }

      input = this._currentInput;
    } else {
      input = this._inputs[index];

      if (!input) {
        return handleCallback(new Error('Invalid input index'));
      }
    }

    // Find ffprobe
    this._getFfprobePath(function(err, path) {
      if (err) {
        return handleCallback(err);
      } else if (!path) {
        return handleCallback(new Error('Cannot find ffprobe'));
      }

      var stdout = '';
      var stdoutClosed = false;
      var stderr = '';
      var stderrClosed = false;

      // Spawn ffprobe
      var src = input.isStream ? 'pipe:0' : input.source;
      var probeArgs = ['-show_streams', '-show_format', '-show_chapters'].concat(options);
      if (useJSON) {
        probeArgs.push('-of', 'json');
      }
      probeArgs.push(src);
      var ffprobe = spawn(path, probeArgs, {windowsHide: true});

      if (input.isStream) {
        // Skip errors on stdin. These get thrown when ffprobe is complete and
        // there seems to be no way hook in and close stdin before it throws.
        ffprobe.stdin.on('error', function(err) {
          if (['ECONNRESET', 'EPIPE', 'EOF'].indexOf(err.code) >= 0) { return; }
          handleCallback(err);
        });

        // Once ffprobe's input stream closes, we need no more data from the
        // input
        ffprobe.stdin.on('close', function() {
            input.source.pause();
            input.source.unpipe(ffprobe.stdin);
        });

        input.source.pipe(ffprobe.stdin);
      }

      ffprobe.on('error', handleCallback);

      // Ensure we wait for captured streams to end before calling callback
      var exitError = null;
      function handleExit(err) {
        if (err) {
          exitError = err;
        }

        if (processExited && stdoutClosed && stderrClosed) {
          if (exitError) {
            if (stderr) {
              exitError.message += '\n' + stderr;
            }

            return handleCallback(exitError);
          }

          // Process output
          var data;
          if (useJSON) {
            try {
              data = JSON.parse(stdout);
              if (!data || typeof data !== 'object' || Array.isArray(data)) {
                throw new Error('Expected a metadata object');
              }
            } catch (parseError) {
              return handleCallback(new Error('Cannot parse ffprobe JSON output: ' + parseError.message, { cause: parseError }));
            }
            return handleCallback(null, data);
          }
          data = parseFfprobeOutput(stdout);

          // Handle legacy output with "TAG:x" and "DISPOSITION:x" keys
          [data.format].concat(data.streams, data.chapters).forEach(function(target) {
            if (target) {
              var legacyTagKeys = Object.keys(target).filter(legacyTag);

              if (legacyTagKeys.length) {
                target.tags = target.tags || {};

                legacyTagKeys.forEach(function(tagKey) {
                  target.tags[tagKey.substr(4)] = target[tagKey];
                  delete target[tagKey];
                });
              }

              var legacyDispositionKeys = Object.keys(target).filter(legacyDisposition);

              if (legacyDispositionKeys.length) {
                target.disposition = target.disposition || {};

                legacyDispositionKeys.forEach(function(dispositionKey) {
                  target.disposition[dispositionKey.substr(12)] = target[dispositionKey];
                  delete target[dispositionKey];
                });
              }
            }
          });

          handleCallback(null, data);
        }
      }

      // Handle ffprobe exit
      var processExited = false;
      ffprobe.on('exit', function(code, signal) {
        processExited = true;

        if (code) {
          handleExit(new Error('ffprobe exited with code ' + code));
        } else if (signal) {
          handleExit(new Error('ffprobe was killed with signal ' + signal));
        } else {
          handleExit();
        }
      });

      // Handle stdout/stderr streams
      ffprobe.stdout.on('data', function(data) {
        stdout += data;
      });

      ffprobe.stdout.on('close', function() {
        stdoutClosed = true;
        handleExit();
      });

      ffprobe.stderr.on('data', function(data) {
        stderr += data;
      });

      ffprobe.stderr.on('close', function() {
        stderrClosed = true;
        handleExit();
      });
    });
  }
};
