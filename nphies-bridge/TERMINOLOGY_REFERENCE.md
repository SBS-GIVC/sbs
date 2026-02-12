# NPHIES Terminology Reference Integration

The bridge can now load and validate codings from NPHIES Codeable Concept CSV exports.

## Configure

Set the directory containing the CSV files:

```bash
export NPHIES_REFERENCE_DIR="/path/to/Nphies Codeable Concept v5"
```

Optional flags:

```bash
# Disable catalog loading entirely (default: enabled)
export NPHIES_TERMINOLOGY_ENABLED=false

# Reject submissions when terminology validation finds errors (default: false)
export NPHIES_TERMINOLOGY_STRICT=true
```

## Behavior

- On `POST /submit-claim` and `POST /submit-preauth`, the bridge validates all detected `coding` entries.
- Unknown codes in known code systems are reported as errors.
- Unknown code systems under `http://nphies.sa/terminology/CodeSystem/` are reported as errors.
- Validation details are returned in the `terminology_validation` field.
- In strict mode, payloads with terminology errors are rejected with HTTP `422`.

## New Endpoints

- `GET /terminology/summary`
- `GET /terminology/codesystems`
- `GET /terminology/codes?system=<codesystem>&q=<query>&limit=<n>`
- `GET /terminology/lookup?system=<codesystem>&code=<code>`
- `POST /terminology/validate-code`
- `POST /terminology/validate-payload`

