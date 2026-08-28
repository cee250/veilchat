# VeilChat self-hosted encrypted relay

This relay is an intentionally small storage service for a user-controlled machine or private server. It stores one opaque encrypted vault envelope at `data/vault.json`; it never receives the readable messages or the vault passphrase. The browser derives an AES-GCM key from the passphrase before uploading, so losing the passphrase means the relay cannot recover the contents.

Run it with Node.js:

```bash
RELAY_TOKEN='use-a-long-random-token' RELAY_DATA_DIR='./data' PORT=8787 node server.mjs
```

Set the app’s relay URL to the reachable base URL, for example `https://your-domain.example`, and use the same token in the VeilChat profile vault panel. The relay endpoint is `PUT`/`GET /v1/veilchat/vault`.

For production, place the relay behind HTTPS, use a long random token or a stronger identity layer, restrict CORS to the VeilChat origin, back up the encrypted file separately, and monitor disk usage. The relay does not make the product anonymous or untrackable: network metadata, hosting logs, device compromise, passphrase compromise, and lawful access remain outside this component’s protection boundary.
