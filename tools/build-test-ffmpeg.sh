#!/usr/bin/env bash
# Build the codecs/containers used by the integration suite, not a production distribution.
# Prerequisites: a C compiler, make, curl, tar, libmp3lame-dev, libx264-dev and zlib1g-dev.
set -euo pipefail
prefix=${1:?Usage: bash tools/build-test-ffmpeg.sh /absolute/install/path}
case "$prefix" in
  /*) ;;
  *) echo 'The install path must be absolute.' >&2; exit 2 ;;
esac
build_dir=$(mktemp -d)
trap 'rm -rf "$build_dir"' EXIT
curl --fail --location --retry 3 \
  https://codeload.github.com/FFmpeg/FFmpeg/tar.gz/1041abdc962f4cc4f394aa8de9dc5236c0c3b9e7 \
  --output "$build_dir/source.tar.gz"
tar -xzf "$build_dir/source.tar.gz" -C "$build_dir" --strip-components=1
cd "$build_dir"
./configure --prefix="$prefix" --disable-x86asm --disable-doc --disable-debug \
  --disable-autodetect --disable-everything --enable-ffmpeg --enable-ffprobe --pkg-config-flags=--static \
  --enable-protocol=file,pipe,http,tcp \
  --enable-demuxer=avi,mpegps,mpegts,mpegvideo,wav,mp3,flv,concat,mov,lavfi \
  --enable-muxer=avi,mp4,flv,wav,mp3,image2,image2pipe,null,matroska,mpegts \
  --enable-decoder=mpeg1video,mpeg2video,mpegvideo,mpeg4,mp2,mp2float,mp3,mp3float,pcm_s16le,pcm_u8,flv,h264,rawvideo \
  --enable-encoder=mpeg4,libx264,vorbis,libmp3lame,pcm_s16le,pcm_u16le,png,rawvideo,aac,flv \
  --enable-parser=mpegaudio,mpegvideo,mpeg4video,h264 \
  --enable-filters --enable-indev=lavfi --enable-gpl --enable-libx264 --enable-libmp3lame --enable-zlib
make -j"${BUILD_JOBS:-4}"
make install
"$prefix/bin/ffmpeg" -version
