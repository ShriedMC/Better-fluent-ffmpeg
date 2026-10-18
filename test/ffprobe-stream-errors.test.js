'use strict';

var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');
var Readable = require('node:stream').Readable;
var Ffmpeg = require('..');

var audio = path.join(__dirname, 'assets', 'testaudio-one.wav');

['ffprobe', 'ffprobeJSON'].forEach(function(method) {
  describe(method + ' stream lifecycle', function() {
    it('returns a source error once and stops reading the failed stream', async function() {
      var failure = new Error('Download failed');
      var source = new Readable({ read: function() { this.destroy(failure); } });
      // Observe the source independently, so the old implementation fails an
      // assertion rather than crashing Mocha with an unhandled error.
      source.on('error', function() {});
      var originalListeners = source.listenerCount('error');
      var destination;
      var fallback;
      var forcedClose = false;
      var pipe = source.pipe;
      source.pipe = function(target) {
        destination = target;
        target.once('close', function() { clearTimeout(fallback); });
        return pipe.call(this, target);
      };
      var calls = 0;
      var result = await new Promise(function(resolve) {
        fallback = setTimeout(function() {
          forcedClose = true;
          destination.end();
        }, 1000);
        Ffmpeg(source)[method](function(err) {
          calls++;
          resolve(err);
        });
      });
      assert.equal(result, failure);
      assert.equal(source.listenerCount('error'), originalListeners);
      assert.equal(source.listenerCount('data'), 0);
      await new Promise(function(resolve) {
        if (destination.closed) { return resolve(); }
        destination.once('close', resolve);
      });
      assert.equal(forcedClose, false, 'probe stdin should close without test intervention');
      assert.equal(calls, 1);
    });

    it('handles a source error during executable lookup without starting a probe', async function() {
      var source = new Readable({ read: function() {} });
      var failure = new Error('Source failed before probe startup');
      source.on('error', function() {});
      var command = Ffmpeg(source);
      var piped = false;
      source.on('resume', function() { piped = true; });
      command._getFfprobePath = function(callback) {
        setImmediate(function() {
          source.emit('error', failure);
          callback(null, path.join(__dirname, 'missing-ffprobe'));
        });
      };
      var result = await new Promise(function(resolve) { command[method](resolve); });
      assert.equal(result, failure);
      assert.equal(piped, false);
      assert.equal(source.listenerCount('error'), 1);
      source.destroy();
    });

    it('removes its source error listener after successful probing', async function() {
      var source = fs.createReadStream(audio);
      var originalListeners = source.listenerCount('error');
      try {
        var result = await new Promise(function(resolve, reject) {
          Ffmpeg(source)[method](function(err, data) { err ? reject(err) : resolve(data); });
        });
        assert.equal(result.streams[0].codec_type, 'audio');
        assert.equal(source.listenerCount('error'), originalListeners);
        assert.equal(source.listenerCount('data'), 0);
      } finally {
        source.destroy();
      }
    });

    it('cleans up the readable when the executable cannot be spawned', async function() {
      var source = new Readable({ read: function() {} });
      var command = Ffmpeg(source);
      command._getFfprobePath = function(callback) {
        callback(null, path.join(__dirname, 'missing-ffprobe'));
      };
      try {
        var result = await new Promise(function(resolve) { command[method](resolve); });
        assert.equal(result.code, 'ENOENT');
        assert.equal(source.listenerCount('error'), 0);
        assert.equal(source.listenerCount('data'), 0);
      } finally {
        source.destroy();
      }
    });

    it('stops the probe when its stdin reports an unexpected error', async function() {
      var source = new Readable({ read: function() {} });
      var failure = new Error('Probe input failed');
      var destination;
      var fallback;
      var forcedClose = false;
      var pipe = source.pipe;
      source.pipe = function(target) {
        destination = target;
        target.once('close', function() { clearTimeout(fallback); });
        setImmediate(function() { target.emit('error', failure); });
        return pipe.call(this, target);
      };
      try {
        var calls = 0;
        var result = await new Promise(function(resolve) {
          // Close stdin as a safety net if a regression leaves the child alive.
          fallback = setTimeout(function() {
            forcedClose = true;
            destination.end();
          }, 1000);
          Ffmpeg(source)[method](function(err) {
            calls++;
            resolve(err);
          });
        });
        assert.equal(result, failure);
        assert.equal(source.listenerCount('error'), 0);
        assert.equal(source.listenerCount('data'), 0);
        await new Promise(function(resolve) {
          if (destination.closed) { return resolve(); }
          destination.once('close', resolve);
        });
        assert.equal(forcedClose, false, 'probe stdin should close without test intervention');
        assert.equal(calls, 1);
      } finally {
        source.destroy();
      }
    });
  });
});
