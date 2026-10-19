# Contributing to Clinear

Clinear is an independent, MIT-licensed macOS prototype. Small fixes, clearer setup instructions, reproducible bug reports, and focused improvements to the human–agent workflow are welcome.

## Local setup

Use Node.js 22+, npm, Rust, Git, and Xcode Command Line Tools. Clone the repository, then:

```sh
npm ci
npm run desktop
```

See the [README](README.md#first-run) for optional service connections and local CLI authentication. A detected executable is not proof that its account works. Keep credentials in local settings or an ignored `.env`; never include them in issues, screenshots, or commits.

For UI-only work, `npm run dev` starts a read-only preview. Real local execution requires the Tauri app.

## Make a focused change

1. Create a branch and describe the behavior you want to change.
2. Keep existing execution and publication approval boundaries intact. Card movement must not launch an agent.
3. Add meaningful regression coverage for changes to execution, persistence, parsing, or publication behavior.
4. Run the checks relevant to the change:

```sh
npm test
npm run check
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

`npm run test:live` makes real model requests through configured accounts and may incur usage. It is optional for ordinary UI/documentation changes; never report it as passing unless you actually ran it.

## Report and review

Include the macOS version, expected behavior, reproduction steps, and relevant redacted output in a [GitHub issue](https://github.com/bigmacfive/clinear/issues). Distinguish a fixture or mocked test from a real integration call. For UI changes, provide a clear screenshot and the viewport size.

In a pull request, explain the resulting behavior, how you checked it, and any remaining limitations. Do not publish to third-party accounts as part of an automated test. Use a separate local data directory with `CLINEAR_DATA_DIR` for disposable experiments, preserving your normal board and worktrees.

By contributing, you agree that your contributions are licensed under the repository's [MIT license](LICENSE).
