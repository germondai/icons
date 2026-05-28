# Security Policy

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Instead, email **germondai@gmail.com** with:

- A description of the vulnerability
- Steps to reproduce
- Potential impact

You'll receive a response within **48 hours**. Once the issue is confirmed and fixed, a public disclosure will be made.

## Scope

This project is a stateless, read-only SVG/PNG generation API. It accepts URL parameters and returns images — it does not handle authentication, user data, or persistent storage.

Relevant areas for security reports:

- Input parsing / parameter injection
- Denial-of-service via crafted requests
- Unintended file access via asset loading
