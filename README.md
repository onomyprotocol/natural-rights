# natural-rights

An implementation of [Cryptographically Enforced Orthogonal Access Control at Scale](https://dl.acm.org/citation.cfm?id=3201602)

Uses proxy re-encryption to manage revocable access to encrypted data without having access to that encrypted data.

Proxy re-encryption is not implemented in this library, users are expected to provide their own (re-)encryption, transform, and signature primitives.

Built with: https://github.com/alexjoverm/typescript-library-starter
