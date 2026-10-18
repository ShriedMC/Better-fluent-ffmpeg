'use strict';

var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');
var Ffmpeg = require('..');

var fixture = path.join(__dirname, 'assets', 'metadata-chapters-rotation.mp4');
var audio = path.join(__dirname, 'assets', 'testaudio-one.wav');
var transportStream = path.join(__dirname, 'assets', 'testvideo-5m.mpg');

function probeJSON(file, options) {
  return new Promise(function(resolve, reject) {
    Ffmpeg.ffprobeJSON(file, options || [], function(err, data) {
      err ? reject(err) : resolve(data);
    });
  });
}

describe('Structured ffprobe metadata', function() {
  it('#1059 populates chapters and chapter tags in the existing ffprobe API', function(done) {
    Ffmpeg.ffprobe(fixture, function(err, data) {
      assert.ifError(err);
      assert.equal(data.chapters.length, 2);
      assert.equal(data.chapters[0].start_time, 0);
      assert.equal(data.chapters[0].end_time, 0.8);
      assert.equal(data.chapters[0].tags.title, 'Opening');
      assert.equal(data.chapters[1].tags.title, 'Closing');
      assert.equal(typeof data.format.duration, 'number');
      done();
    });
  });

  it('returns native JSON types and chapters through the static API', async function() {
    var data = await probeJSON(fixture);
    assert.equal(data.chapters.length, 2);
    assert.equal(data.chapters[1].start_time, '0.800000');
    assert.equal(data.chapters[0].tags.title, 'Opening');
    assert.equal(data.streams[0].width, 64);
    assert.equal(typeof data.format.duration, 'string');
    assert.equal(Number(data.format.duration), 2);
  });

  it('#457 preserves nested display matrices, rotation and multiline values', async function() {
    var data = await probeJSON(fixture);
    var video = data.streams.find(function(s) { return s.codec_type === 'video'; });
    var matrix = video.side_data_list.find(function(s) { return s.side_data_type === 'Display Matrix'; });
    assert.equal(matrix.rotation, 90);
    assert.match(matrix.displaymatrix, /00000000:.*\n00000001:.*\n00000002:/);
    assert.equal(video.rotation, undefined);
    assert.equal(data.format.tags.title, '0007');
    assert.equal(data.format.tags.comment, 'first line\nsecond=line');
  });

  it('#1200 returns MPEG-TS programs and their nested streams when requested', async function() {
    this.timeout(10000);
    var data = await probeJSON(transportStream, ['-show_programs']);
    assert.equal(data.programs[0].program_id, 1);
    assert.ok(data.programs[0].streams.some(function(s) { return s.codec_type === 'video'; }));
    assert.ok(data.programs[0].streams.some(function(s) { return s.codec_type === 'audio'; }));
    assert.ok(data.streams.length >= 2);
  });

  it('forwards probe options while retaining structured JSON output', async function() {
    var data = await probeJSON(fixture,
      ['-select_streams', 'v:0', '-show_entries', 'stream=index,width,height:format=duration']);
    assert.equal(data.streams.length, 1);
    assert.equal(data.streams[0].width, 64);
    assert.equal(data.streams[0].height, 48);
    assert.equal(data.format.filename, undefined);
  });

  it('keeps JSON output even when caller options name another writer', async function() {
    var data = await probeJSON(fixture, ['-of', 'xml']);
    assert.ok(Array.isArray(data.streams));
    assert.equal(data.format.tags.title, '0007');
  });

  it('supports last-input and explicit-input selection on command instances', async function() {
    var command = Ffmpeg(audio).input(fixture);
    var last = await new Promise(function(resolve, reject) {
      command.ffprobeJSON(function(err, data) { err ? reject(err) : resolve(data); });
    });
    assert.equal(last.format.tags.title, '0007');
    var first = await new Promise(function(resolve, reject) {
      command.ffprobeJSON(0, ['-select_streams', 'a:0'], function(err, data) {
        err ? reject(err) : resolve(data);
      });
    });
    assert.equal(first.format.format_name, 'wav');
    assert.equal(first.streams[0].codec_type, 'audio');
  });

  it('supports readable inputs with the same consumption semantics as ffprobe', async function() {
    var source = fs.createReadStream(audio);
    try {
      var data = await new Promise(function(resolve, reject) {
        Ffmpeg(source).ffprobeJSON(function(err, result) { err ? reject(err) : resolve(result); });
      });
      assert.equal(data.format.filename, 'pipe:0');
      assert.equal(data.streams[0].codec_type, 'audio');
    } finally {
      source.destroy();
    }
  });

  it('reports missing files through the callback', async function() {
    await assert.rejects(probeJSON(path.join(__dirname, 'assets', 'does-not-exist.mp4')), /ffprobe exited/);
  });

  it('reports missing inputs and invalid input indexes without spawning', function() {
    var missing;
    Ffmpeg().ffprobeJSON(function(err) { missing = err; });
    assert.match(missing.message, /No input specified/);
    var invalid;
    Ffmpeg(fixture).ffprobeJSON(4, function(err) { invalid = err; });
    assert.match(invalid.message, /Invalid input index/);
  });
});
