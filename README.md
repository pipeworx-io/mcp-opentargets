# mcp-opentargets

Open Targets disease/target/drug knowledge graph (GraphQL)

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 250+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `target` | Target (gene) profile by Ensembl id. |
| `disease` | Disease profile by EFO id. |
| `drug` | Drug profile by ChEMBL id. |
| `search` | Platform search across diseases/targets/drugs. |
| `target_associations` | Top disease associations for a target. |
| `disease_associations` | Top target associations for a disease. |
| `target_known_drugs` | Drugs clinically tested against a target. |

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

Or connect to the full Pipeworx gateway for access to all 250+ data sources:

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

- [All tools and guides](https://github.com/pipeworx-io/examples)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
