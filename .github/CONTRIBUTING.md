# Contributing to Better-fluent-ffmpeg

This is an independent continuation of the archived fluent-ffmpeg project. Open issues and pull requests in [ShriedMC/Better-fluent-ffmpeg](https://github.com/ShriedMC/Better-fluent-ffmpeg), where this fork is maintained. AI-assisted maintenance is reviewed by a human; issue reports receive human responses.

## Where help is useful

- Reproduce an unresolved report in [the upstream issue review](../UPSTREAM_ISSUES.md), especially Windows process control or seeking on non-seekable streams. Link the original report and describe what you verified.
- Test your application's conversions on current FFmpeg releases. Include the specific codecs and filters involved.
- Improve examples, migration notes, or documentation. Small documentation fixes can go straight to a pull request.

These are starting points, not confirmed diagnoses or assigned tasks. A minimal reproduction is useful even when you cannot supply a fix. Discuss substantial new APIs before implementing them; small bug fixes do not need a separate proposal.

## Development setup

Use Node.js 22.22.2 or newer, Yarn 1.22.22, and FFmpeg with ffprobe. The full suite also uses flvmeta (or flvtool2), libmp3lame, and libx264. On Debian/Ubuntu, `sudo apt-get install ffmpeg flvmeta` provides the executable packages; check your FFmpeg build's encoders.

```sh
git clone https://github.com/ShriedMC/Better-fluent-ffmpeg.git
cd Better-fluent-ffmpeg
npm install --global yarn@1.22.22
yarn install --frozen-lockfile
yarn test
yarn docs
node tools/check-package.js
```

You can run a focused regression suite during development:

```sh
NODE_ENV=test node node_modules/mocha/bin/mocha.js --require should test/ffprobe-json.test.js
```

Run the full suite before submitting runtime changes. CI tests Node 22/24/26 and an FFmpeg 8.1.3 build on Linux. Seven legacy/optional checks remain pending by default; the [README testing notes](../README.md#running-tests) explain them. Generated `build/docs` and `coverage` output should stay out of commits.

## Reporting a bug

Include the fork's Git commit (or your dependency lockfile's resolved reference), Node.js version, operating system, `ffmpeg -version`, and `ffprobe -version`. Include a minimal script, expected behavior, actual behavior, and a small sample file or instructions to generate it. Confirm that you installed the fork rather than the upstream npm package.

Capture the command and full FFmpeg diagnostics:

```js
ffmpeg('input.mp4')
  .on('start', command => console.log(command))
  .on('error', (err, stdout, stderr) => {
    console.error(err);
    console.error(stdout);
    console.error(stderr);
  })
  .save('output.mp4');
```

Try the printed command directly when practical and report whether it behaves differently. For probe problems, include the callback error and the corresponding ffprobe command's output. Remove credentials and private input URLs from shared diagnostics.

## Pull requests

Explain the failing behavior and the resulting behavior. Add a regression that demonstrates a runtime bug, keep fixtures small and redistributable, and update API docs and the change log when behavior changes. State the checks you ran and any platform or input limitations. Preserve original author credits and the MIT license.
