# Changelog

## Unreleased

- Add static and instance `ffprobeJSON()` methods for native structured metadata, preserving display matrices, rotation, multiline tags, and optional MPEG-TS program data (upstream #457/#1200). Existing `ffprobe()` value types are unchanged.
- Request chapters by default and normalize chapter tags in the legacy probe API (upstream #1059). Document explicit probe options and their separation from transcoding input options (#1246/#1146).

- Preserve cloned input type flags and the current input so input options, stream guards, and ffprobe continue to work on clones (upstream #473). Clone processing options independently to prevent timeout/niceness changes from affecting the original command. Clarify shared stream and event-handler behavior.

- Honor standalone `aspect()` / `withAspectRatio()` calls using FFmpeg's display-aspect option; preserve existing sizing behavior and reject invalid ratios (upstream #1306).
- Retain captured diagnostics and invoke the process completion callback once when a child emits both error and exit events (upstream #1316).
- Add regressions for device format preflight (#1323/#1282) and invalid executable paths after cache warming (#1285). See [UPSTREAM_ISSUES.md](UPSTREAM_ISSUES.md) for the reviewed reports and remaining limitations.

- Require Node.js 22.22.2 or newer; test Node 22, 24, and 26 in CI.
- Parse FFmpeg 8's two-column filter flags and FFmpeg 7/8's device format column while retaining older listing support.
- Include dynamic and mixed-input filters in capability discovery. Dynamic pad types are reported as `dynamic`.
- Refresh cached capabilities when changing the FFmpeg executable.
- Preserve fractional FPS and handle whitespace, KiB sizes, and unavailable progress timestamps.
- Propagate executable lookup and encoder discovery failures without secondary exceptions.
- Use current async/which APIs, refresh dependencies, and replace NYC with V8-based c8 coverage.
- Rate-limit process-control test inputs so signal/timeout tests remain reliable on fast machines.
- Build documentation with JSDoc's bundled template and restrict npm packages to runtime files and documentation.
- Update fork metadata and CI; coverage reports are retained as GitHub artifacts without external service tokens.

The package name and version remain `fluent-ffmpeg@2.1.3` pending a release decision. No package is published by CI.
