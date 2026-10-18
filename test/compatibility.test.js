'use strict';

var assert = require('assert');
var EventEmitter = require('events');
var PassThrough = require('stream').PassThrough;
var path = require('path');
var Ffmpeg = require('..');
var utils = require('../lib/utils');

describe('Modern FFmpeg compatibility', function() {
  beforeEach(function() {
    Ffmpeg.setFfmpegPath('ffmpeg');
  });

  afterEach(function() {
    Ffmpeg.setFfmpegPath('ffmpeg');
    new Ffmpeg()._forgetPaths();
  });

  function listing(text) {
    var command = new Ffmpeg();
    command._spawnFfmpeg = function(args, options, callback) {
      var output = utils.linesRing(0);
      output.append(text);
      output.close();
      callback(null, output);
    };
    return command;
  }

  [' TS.', ' TS', ''].forEach(function(flags) {
    it('parses filters with ' + (flags.trim().length || 'no') + ' flag columns', function(done) {
      listing([
        flags + ' anull A->A Pass audio unchanged.',
        flags + ' scale V->V Scale video.',
        flags + ' concat N->N Concatenate streams.',
        flags + ' mix AAA->A Mix audio.',
        flags + ' mixed AV->V Mixed inputs.',
        flags + ' source |->V Video source.',
        flags + ' sink V->| Video sink.'
      ].join('\n')).availableFilters(function(err, filters) {
        assert.ifError(err);
        assert.equal(filters.anull.input, 'audio');
        assert.equal(filters.scale.output, 'video');
        assert.equal(filters.concat.input, 'dynamic');
        assert.equal(filters.concat.output, 'dynamic');
        assert.equal(filters.concat.multipleInputs, true);
        assert.equal(filters.concat.multipleOutputs, true);
        assert.equal(filters.mix.multipleInputs, true);
        assert.equal(filters.mixed.multipleInputs, true);
        assert.equal(filters.source.input, 'none');
        assert.equal(filters.sink.output, 'none');
        done();
      });
    });
  });

  it('parses legacy formats and the FFmpeg 8 device column', function(done) {
    listing([
      ' DE avi             AVI (Audio Video Interleaved)',
      ' D  mov,mp4         QuickTime / MOV',
      ' DE  wav            WAV / WAVE',
      ' D d lavfi          Libavfilter virtual input device',
      '  Ed null           Null output device',
      '  E  mp4            MP4 (MPEG-4 Part 14)'
    ].join('\n')).availableFormats(function(err, formats) {
      assert.ifError(err);
      assert.equal(formats.avi.canMux, true);
      assert.equal(formats.avi.canDemux, true);
      assert.equal(formats.mov.canDemux, true);
      assert.equal(formats.mp4.canMux, true);
      assert.equal(formats.mp4.canDemux, true);
      assert.equal(formats.lavfi.canDemux, true);
      assert.equal(formats.null.canMux, true);
      assert.equal(formats.wav.canDemux, true);
      done();
    });
  });

  it('refreshes capabilities when switching FFmpeg binaries', function(done) {
    var command = listing(' DE avi AVI');
    command.availableFormats(function(err, formats) {
      assert.ifError(err);
      assert.ok(formats.avi);
      command.setFfmpegPath('other-ffmpeg');
      listing(' DE wav WAV').availableFormats(function(err, formats) {
        assert.ifError(err);
        assert.ok(formats.wav);
        assert.equal(formats.avi, undefined);
        done();
      });
    });
  });

  it('parses fractional FPS, whitespace and KiB progress', function() {
    var command = new EventEmitter();
    command._ffprobeData = { format: { duration: 10 } };
    var result;
    command.on('progress', function(progress) { result = progress; });
    utils.extractProgress(command,
      'frame=   15 fps=29.97 q=2.0  size=   128KiB\ttime=00:00:05.00 bitrate=209.7kbits/s speed=1.2x');
    assert.equal(result.frames, 15);
    assert.equal(result.currentFps, 29.97);
    assert.equal(result.targetSize, 128);
    assert.equal(result.percent, 50);
  });

  it('ignores unavailable timestamps and unrelated key/value log lines', function() {
    var command = new EventEmitter();
    command._ffprobeData = { format: { duration: 10 } };
    command.on('progress', function() { assert.fail('Unexpected progress'); });
    utils.extractProgress(command, 'frame=0 fps=0 size=N/A time=N/A bitrate=N/A speed=N/A');
    utils.extractProgress(command, 'foo=bar');
  });

  it('reports path lookup errors without trying to read missing buffers', function(done) {
    var command = new Ffmpeg().output('unused.avi');
    command._prepare = function(callback) { callback(null, []); };
    command._getFfmpegPath = function(callback) { callback(new Error('Path lookup failed')); };
    command.on('error', function(err, stdout, stderr) {
      assert.equal(err.message, 'Path lookup failed');
      assert.equal(stdout, '');
      assert.equal(stderr, '');
      done();
    }).run();
  });

  it('propagates encoder discovery errors during preparation', function(done) {
    var command = new Ffmpeg();
    command._checkCapabilities = function(callback) { callback(); };
    command.availableEncoders = function(callback) { callback(new Error('Encoder lookup failed')); };
    command._prepare(function(err) {
      assert.equal(err.message, 'Encoder lookup failed');
      done();
    });
  });

  it('calls ffprobe back once when both its input pipe and process fail', function(done) {
    var input = new PassThrough();
    input.pipe = function(destination) {
      destination.emit('error', new Error('Input pipe failed'));
      return destination;
    };
    var command = new Ffmpeg(input);
    command._getFfprobePath = function(callback) {
      callback(null, path.join(__dirname, 'assets', 'ffprobe-does-not-exist'));
    };
    var errors = [];
    command.ffprobe(function(err) { errors.push(err); });
    setTimeout(function() {
      assert.equal(errors.length, 1);
      assert.equal(errors[0].message, 'Input pipe failed');
      done();
    }, 50);
  });
});
