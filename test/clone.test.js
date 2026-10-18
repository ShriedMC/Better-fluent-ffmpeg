'use strict';

var assert = require('node:assert/strict');
var fs = require('node:fs');
var os = require('node:os');
var path = require('node:path');
var Readable = require('node:stream').Readable;
var Ffmpeg = require('..');

describe('Cloned command inputs (upstream #473)', function() {
  var video = path.join(__dirname, 'assets', 'testvideo-43.avi');
  var audio = path.join(__dirname, 'assets', 'testaudio-one.wav');
  var directory;

  before(function() {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fluent-ffmpeg-clone-'));
  });

  after(function() {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it('configures the cloned current input without changing the original', function() {
    var command = Ffmpeg(audio).input(video).inputFormat('avi');
    var clone = command.clone().seekInput(0.5).inputFormat('mpegvideo');
    var args = clone._getArguments();
    var inputIndex = args.indexOf(video);
    assert.ok(args.indexOf('-ss') > args.indexOf(audio));
    assert.ok(args.indexOf('-ss') < inputIndex);
    assert.equal(args[args.indexOf('-ss') + 1], 0.5);
    assert.equal(command._getArguments().includes('-ss'), false);
    assert.equal(command._getArguments().includes('mpegvideo'), false);
  });

  it('keeps processing timeouts independent', function() {
    var command = Ffmpeg(video, { timeout: 30 });
    var clone = command.clone();
    clone.options.timeout = 2;
    assert.equal(command.options.timeout, 30);
    command.options.timeout = 60;
    assert.equal(clone.options.timeout, 2);
  });

  it('probes the last input on a clone without an explicit input index', function(done) {
    Ffmpeg(audio).input(video).clone().ffprobe(function(err, data) {
      assert.ifError(err);
      assert.equal(data.format.format_name, 'avi');
      assert.equal(data.streams[0].codec_type, 'video');
      done();
    });
  });

  it('preserves stream behavior when explicitly probing a cloned input', function(done) {
    var source = fs.createReadStream(audio);
    Ffmpeg(source).clone().ffprobe(0, function(err, data) {
      source.destroy();
      assert.ifError(err);
      assert.equal(data.format.format_name, 'wav');
      assert.equal(data.streams[0].codec_type, 'audio');
      done();
    });
  });

  it('continues to reject a second stream after cloning', function() {
    var first = Readable.from([Buffer.alloc(4)]);
    var second = Readable.from([Buffer.alloc(4)]);
    try {
      assert.throws(function() { Ffmpeg(first).clone().input(second); }, /Only one input stream/);
    } finally {
      first.destroy();
      second.destroy();
    }
  });

  it('processes independent clips from a reusable file command', async function() {
    this.timeout(10000);
    var base = Ffmpeg(video).videoCodec('mpeg4').noAudio();

    function encode(command, target) {
      return new Promise(function(resolve, reject) {
        command.on('error', reject).on('end', resolve).save(target);
      });
    }

    function probe(target) {
      return new Promise(function(resolve, reject) {
        Ffmpeg.ffprobe(target, function(err, data) { err ? reject(err) : resolve(data); });
      });
    }

    var first = path.join(directory, 'first.avi');
    var second = path.join(directory, 'second.avi');
    await encode(base.clone().seekInput(0.2).duration(0.2), first);
    await encode(base.clone().seekInput(0.6).duration(0.4), second);
    var firstInfo = await probe(first);
    var secondInfo = await probe(second);
    assert.ok(Math.abs(firstInfo.format.duration - 0.2) < 0.05);
    assert.ok(Math.abs(secondInfo.format.duration - 0.4) < 0.05);
    assert.equal(base._getArguments().includes('-ss'), false);
    assert.equal(base._getArguments().includes('-t'), false);
  });
});
