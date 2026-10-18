'use strict';

var assert = require('node:assert/strict');
var fs = require('node:fs');
var os = require('node:os');
var path = require('node:path');
var Ffmpeg = require('..');
var utils = require('../lib/utils');

describe('Upstream issue regressions', function() {
  var originalFfmpeg;
  var directory;
  var input = path.join(__dirname, 'assets', 'testvideo-169.avi');

  before(function(done) {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fluent-ffmpeg-issues-'));
    new Ffmpeg()._getFfmpegPath(function(err, executable) {
      originalFfmpeg = executable;
      done(err);
    });
  });

  afterEach(function() {
    Ffmpeg.setFfmpegPath(originalFfmpeg);
    new Ffmpeg()._forgetPaths();
  });

  after(function() {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it('#1306 applies a standalone aspect ratio without resizing pixels', function(done) {
    this.timeout(10000);
    var output = path.join(directory, 'square-display.avi');
    Ffmpeg(input).withAspectRatio('1:1').videoCodec('mpeg4').noAudio().duration(0.1)
      .on('error', done)
      .on('end', function() {
        Ffmpeg.ffprobe(output, function(err, metadata) {
          assert.ifError(err);
          Ffmpeg.ffprobe(input, function(err, source) {
            assert.ifError(err);
            var video = metadata.streams.find(function(s) { return s.codec_type === 'video'; });
            var sourceVideo = source.streams.find(function(s) { return s.codec_type === 'video'; });
            assert.equal(video.width, sourceVideo.width);
            assert.equal(video.height, sourceVideo.height);
            assert.equal(video.display_aspect_ratio, '1:1');
            done();
          });
        });
      }).save(output);
  });

  it('#1306 keeps standalone aspect ratios separate for each output', function() {
    var args = Ffmpeg(input).aspect('4:3').aspect('1:1').output('one.avi')
      .output('two.avi').aspect('16:9')._getArguments();
    var first = args.indexOf('-aspect');
    var second = args.indexOf('-aspect', first + 1);
    assert.notEqual(first, -1);
    assert.notEqual(second, -1);
    assert.equal(args[first + 1], 1);
    assert.equal(args[second + 1], 16 / 9);
    assert.equal(args.filter(function(arg) { return arg === '-aspect'; }).length, 2);
  });

  it('#1306 removes the standalone aspect option when size is specified later', function() {
    var args = Ffmpeg(input).aspect('1:1').size('160x?').output('one.avi')._getArguments();
    assert.equal(args.includes('-aspect'), false);
    assert.ok(args.includes('scale=w=160:h=160'));
    args = Ffmpeg(input).size('160x?').aspect('1:1').output('two.avi')._getArguments();
    assert.equal(args.includes('-aspect'), false);
    assert.ok(args.includes('scale=w=160:h=160'));
  });

  it('rejects zero, negative, infinite and malformed aspect ratios', function() {
    [0, -1, Infinity, NaN, '0:1', '1:0', 'Infinity', 'invalid', {}, null, undefined].forEach(function(ratio) {
      assert.throws(function() { Ffmpeg().aspect(ratio); }, /Invalid aspect ratio/);
    });
  });

  ['gdigrab', 'lavfi', 'x11grab'].forEach(function(device) {
    it('#1323/#1282 accepts the advertised ' + device + ' device during preflight', function(done) {
      var command = Ffmpeg('source').inputFormat(device);
      command._spawnFfmpeg = function(args, options, callback) {
        assert.deepEqual(args, ['-formats']);
        var output = utils.linesRing(0);
        output.append(' D d ' + device + ' Device input\n');
        output.close();
        callback(null, output);
      };
      command.availableEncoders = function(callback) { callback(null, {}); };
      command._checkCapabilities(done);
    });
  });

  it('#1282 transcodes a real lavfi device input without a capabilities bypass', function(done) {
    this.timeout(10000);
    var output = path.join(directory, 'silence.wav');
    Ffmpeg('anullsrc=channel_layout=mono:sample_rate=8000').inputFormat('lavfi')
      .audioCodec('pcm_s16le').duration(0.1).format('wav')
      .on('error', done)
      .on('end', function() {
        Ffmpeg.ffprobe(output, function(err, metadata) {
          assert.ifError(err);
          assert.equal(metadata.streams[0].sample_rate, 8000);
          assert.ok(Math.abs(metadata.format.duration - 0.1) < 0.01);
          done();
        });
      }).save(output);
  });

  it('#1285 reports a bad executable after warming the capabilities cache', function(done) {
    this.timeout(10000);
    Ffmpeg.getAvailableFormats(function(err, formats) {
      assert.ifError(err);
      assert.ok(formats.avi);
      Ffmpeg.setFfmpegPath(path.join(directory, 'missing-ffmpeg'));
      Ffmpeg(input).on('error', function(err) {
        assert.equal(err.code, 'ENOENT');
        done();
      }).save(path.join(directory, 'never-created.avi'));
    });
  });

  it('#1316 preserves diagnostics and finishes once if a child errors before exiting', function(done) {
    this.timeout(5000);
    var command = Ffmpeg();
    command._getFfmpegPath = function(callback) { callback(null, process.execPath); };
    var results = [];
    var failure = new Error('Simulated child-process error');
    command._spawnFfmpeg(['-e', "process.stderr.write('diagnostic\\n'); setTimeout(() => {}, 100)"],
      { captureStdout: true }, function(child, stdout, stderr) {
        stderr.callback(function(line) {
          if (line === 'diagnostic') {
            setImmediate(function() { child.emit('error', failure); });
          }
        });
        child.on('close', function() {
          assert.equal(results.length, 1);
          assert.equal(results[0].err, failure);
          assert.match(results[0].stderr, /diagnostic/);
          done();
        });
      }, function(err, stdout, stderr) {
        results.push({ err: err, stderr: stderr && stderr.get() });
      });
  });
});
