# Changelog

## Unreleased

- Require Node.js 22.22.2 or newer; test Node 22, 24, and 26 in CI.
- Parse FFmpeg 8's two-column filter flags and device format column while retaining older listing support.
- Include dynamic and mixed-input filters in capability discovery. Dynamic pad types are reported as `dynamic`.
- Refresh cached capabilities when changing the FFmpeg executable.
- Preserve fractional FPS and handle whitespace, KiB sizes, and unavailable progress timestamps.
- Propagate executable lookup and encoder discovery failures without secondary exceptions.
- Use current async/which APIs, refresh dependencies, and replace NYC with V8-based c8 coverage.
- Rate-limit process-control test inputs so signal/timeout tests remain reliable on fast machines.
- Build documentation with JSDoc's bundled template and restrict npm packages to runtime files and documentation.
- Update fork metadata and CI; coverage reports are retained as GitHub artifacts without external service tokens.

The package name and version remain `fluent-ffmpeg@2.1.3` pending a release decision. No package is published by CI.
