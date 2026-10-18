'use strict';

var assert = require('node:assert/strict');
var EventEmitter = require('node:events');
var utils = require('../lib/utils');

function codecData(lines) {
  var command = new EventEmitter();
  var state = {};
  var result;
  command.on('codecData', function() { result = Array.from(arguments); });
  lines.concat('Stream mapping:').forEach(function(line) {
    utils.extractCodecData(command, line, state);
  });
  return result;
}

describe('Codec metadata fields', function() {
  it('#682 keeps pixel format and color information together', function() {
    var data = codecData([
      "Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'sample.mp4':",
      '  Duration: 00:00:05.00, start: 0.000000, bitrate: 500 kb/s',
      '  Stream #0:0(und): Video: h264 (Constrained Baseline) (avc1 / 0x31637661), yuv420p(tv, bt709), 560x320, 465 kb/s, 30 fps, 30 tbr, 90k tbn, 60 tbc (default)'
    ])[0];
    assert.equal(data.video, 'h264 (Constrained Baseline) (avc1 / 0x31637661)');
    assert.deepEqual(data.video_details.slice(1, 5), [
      'yuv420p(tv, bt709)', '560x320', '465 kb/s', '30 fps'
    ]);
    assert.equal(data.duration, '00:00:05.00');
  });

  it('preserves nested audio descriptions without shifting later fields', function() {
    var data = codecData([
      "Input #0, wav, from 'surround.wav':",
      '  Stream #0:0: Audio: pcm_s24le, 48000 Hz, 6 channels (FL, FR, FC, LFE, BL, BR), s32 (24 bit), 6912 kb/s'
    ])[0];
    assert.deepEqual(data.audio_details, [
      'pcm_s24le', '48000 Hz', '6 channels (FL, FR, FC, LFE, BL, BR)', 's32 (24 bit)', '6912 kb/s'
    ]);
    assert.equal(data.audio, 'pcm_s24le');
  });

  it('handles nested parentheses and keeps multiple inputs separate', function() {
    var data = codecData([
      "Input #0, mov, from 'hdr.mp4':",
      '  Stream #0:0: Video: hevc (Main 10), yuv420p10le(tv, bt2020nc/bt2020/smpte2084, mastering (primaries, luminance)), 1920x1080, 24 fps',
      "Input #1, wav, from 'mono.wav':",
      '  Stream #1:0: Audio: pcm_s16le, 8000 Hz, mono, s16, 128 kb/s',
      "Output #0, avi, to 'output.avi':",
      '  Stream #0:0: Video: mpeg4, yuv420p, 320x240'
    ]);
    assert.equal(data.length, 2);
    assert.equal(data[0].video_details[1], 'yuv420p10le(tv, bt2020nc/bt2020/smpte2084, mastering (primaries, luminance))');
    assert.equal(data[0].video_details[2], '1920x1080');
    assert.deepEqual(data[1].audio_details, ['pcm_s16le', '8000 Hz', 'mono', 's16', '128 kb/s']);
    assert.equal(data[1].video, '');
  });
});
