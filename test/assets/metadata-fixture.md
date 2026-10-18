# Structured metadata fixture

`metadata-chapters-rotation.mp4` is derived from the existing `testvideo-43.avi` fixture. It contains a 64x48 MPEG-4 video, two chapters, a 90-degree display matrix, a numeric-looking title, and a multiline comment with an equals sign.

Recreate it using a full FFmpeg 7+ build, from the repository root:

```bash
ffmpeg -i test/assets/testvideo-43.avi \
  -i test/assets/metadata-chapters.ffmetadata \
  -map 0:v:0 -vf scale=64:48 -c:v mpeg4 -q:v 5 \
  -map_metadata 1 -map_chapters 1 -metadata title=0007 \
  -metadata comment=$'first line\nsecond=line' -y /tmp/metadata-base.mp4
ffmpeg -display_rotation:v:0 90 -i /tmp/metadata-base.mp4 \
  -c copy -y test/assets/metadata-chapters-rotation.mp4
```

The tests read the checked-in fixture; no fixture generation or external media download is needed during CI.
