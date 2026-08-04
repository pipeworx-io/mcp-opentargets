# @pipeworx/opentargets

[Open Targets](https://platform.opentargets.org) MCP — disease/target/drug knowledge graph that integrates genetic, genomic, transcriptomic, and chemistry evidence. Keyless GraphQL public endpoint.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

- `target(ensembl_id)` — target (gene) profile
- `disease(efo_id)` — disease profile
- `drug(chembl_id)` — drug profile
- `search(query, entity?, size?)` — platform search
- `target_associations(ensembl_id, size?)` — top diseases for a target
- `disease_associations(efo_id, size?)` — top targets for a disease
- `target_known_drugs(ensembl_id, size?)` — clinically tested drugs for a target

## Data source

`https://api.platform.opentargets.org/api/v4/graphql`

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "opentargets": {
      "url": "https://gateway.pipeworx.io/opentargets/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Opentargets data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
