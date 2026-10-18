# Helping people find and evaluate this fork

The useful audience is developers who already depend on fluent-ffmpeg and need current FFmpeg support. Lead with reproducible improvements, installation instructions, and compatibility limits. This document contains recommendations and drafts; it does not record completed publishing or promotion.

## Make the repository easy to identify

Suggested GitHub **About** description:

> Maintained fluent-ffmpeg fork for Node.js and FFmpeg 7/8, with upstream bug fixes, structured ffprobe metadata, and CI.

Suggested website: `https://github.com/ShriedMC/Better-fluent-ffmpeg#readme`

Suggested topics: `ffmpeg`, `ffprobe`, `fluent-ffmpeg`, `nodejs`, `video-processing`, `audio-processing`, `transcoding`, `metadata`.

Repository owners can apply these in GitHub's About settings. Keep the CI badge linked to actual results. Use the [issue review](../UPSTREAM_ISSUES.md) as the evidence behind claims about fixes, and keep the maintenance/oversight statement visible.

## Prioritize a reproducible first release

1. Merge reviewed fixes after CI passes, then choose the commit intended for a release. Exercise the README install and examples from a clean consumer project.
2. Choose a distinct npm name under a maintainer-controlled account or scope, and settle the version policy. The current manifest still says `fluent-ffmpeg@2.1.3`; the upstream npm name does not distribute this fork. Confirm ownership and availability before changing package identity. Document the resulting import or npm-alias installation path and test it.
3. Create a versioned GitHub release and tag with concise release notes: supported Node versions, tested FFmpeg versions, fixed upstream reports, migration differences, and unresolved platform cases. Publishing to npm is a separate maintainer action after package identity and access are settled.
4. Link the versioned release and exact install command in announcements. Until then, identify it as a GitHub-installable development fork and retain the resolved Git SHA in the consumer's lockfile.

A stable package identity and tagged releases give users something they can pin, evaluate, and report against. Avoid claiming universal drop-in compatibility: Node.js 22.22.2 is required, standalone aspect handling changed, and codecs depend on the installed FFmpeg build.

## Share useful examples in relevant communities

| Channel | Material to share | Check before posting |
| --- | --- | --- |
| A personal dev.to post or blog | A migration walkthrough and one before/after bug reproduction, with CI and issue links | Verify code against the release being described |
| Hacker News Show HN | A working install, explanation of why the fork exists, and a request for real migration feedback | Follow current Show HN rules and be available to answer technical questions |
| Node.js or FFmpeg communities | An example relevant to that community, such as native probe metadata or modern capability discovery | Read current self-promotion rules and use any designated showcase thread |
| Existing users and contributors who opt in | Release notes and a narrowly scoped request to try their own workload | Use an existing opted-in channel rather than unsolicited bulk messages |

Publish an initial announcement after the release is reproducible, then share meaningful release updates rather than repeated generic links. Do not advertise by commenting across archived upstream issues. If a community member reports a problem, ask for a minimal reproduction and link the resulting fix back to that discussion when appropriate.

## Short announcement draft

Use after verifying the referenced features are merged. Add a release link when one exists; do not describe an unreleased branch as a published npm release.

> I'm maintaining Better-fluent-ffmpeg, an independent continuation of the archived Node.js fluent-ffmpeg project. It keeps the familiar command-building API while updating capability discovery for FFmpeg 7/8, repairing command cloning, and adding `ffprobeJSON()` for nested metadata and chapters.
>
> CI covers Node 22/24/26 on Linux and includes FFmpeg 8.1.3. Node 22.22.2 or newer and separately installed FFmpeg/ffprobe are required. Maintenance is AI-assisted with human oversight, and issue reports receive human responses.
>
> Install the development fork with `npm install github:ShriedMC/Better-fluent-ffmpeg`; existing `require('fluent-ffmpeg')` imports still work. This fork is not distributed by `npm install fluent-ffmpeg`. I'd especially welcome small reproductions from Windows/macOS users and feedback from existing fluent-ffmpeg applications.
>
> Code, migration notes, and reviewed upstream issues: https://github.com/ShriedMC/Better-fluent-ffmpeg

Suggested post title: **A maintained fluent-ffmpeg fork with FFmpeg 7/8 support and structured probe metadata**.

For Show HN, adapt the title to its current submission rules and add a specific example you can demonstrate. For a tagged release, replace the development-install wording with the tested release install command.

## Technical article outline

Working title: **Moving a fluent-ffmpeg application to a maintained fork**.

- Explain the archived upstream status and the fork's maintenance scope, retaining original author credit.
- Show the GitHub install command, unchanged import, and Node.js prerequisite. Link migration notes before the first conversion.
- Demonstrate `ffprobeJSON()` on a rotated, chaptered MP4. Explain that native duration fields are strings and nested side data is preserved; contrast with the legacy API's existing conversions.
- Walk through one linked upstream bug and its regression test, then show how to reproduce the behavior with the intended release.
- Share the actual CI matrix and known limits. Ask readers to contribute a specific reproduction or platform result.

## Evaluate the response

After an announcement, use GitHub's available traffic/referral data and incoming issues to learn whether people can install the fork and complete a real conversion. Track recurring migration problems and improve the README before another promotion round. Stars can indicate interest, but successful installs, reproducible reports, and useful contributions are better evidence that the fork is helping.
