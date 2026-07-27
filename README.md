# mcp-opentargets

Open Targets MCP — disease/target/drug knowledge graph.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1356+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `target` | "Drug target profile for [gene]" / "is [gene] a druggable target" / "[gene] target info" / "target ID [ENSG...]" — fetch a drug-target profile (Open Targets uses Ensembl gene IDs as target identifiers). Returns approved symbol, name, biotype, protein IDs, pathways, synonyms. Use for target characterization in drug discovery. |
| `disease` | "Disease profile for [EFO_N]" / "look up disease [ID]" — fetch a disease profile from Open Targets by EFO (Experimental Factor Ontology) ID. Returns name, description, therapeutic areas, ontology cross-refs. Pair with `disease_associations` to find drug targets for the disease. |
| `drug` | "Drug info for [ChEMBL ID]" / "look up [drug] target info" / "[CHEMBL...] mechanism" — fetch a drug profile from Open Targets by ChEMBL ID. Returns name, mechanisms of action, indications, target genes, trade names, clinical-trial phase. Use for drug research, mechanism queries. |
| `search` | "Find [disease / drug / gene target]" / "Open Targets lookup for [name]" / "what\'s the Open Targets ID for [X]" — text search across diseases, drug targets, and drugs in the Open Targets Platform (the leading drug-discovery knowledge graph). Returns ranked matches with their canonical IDs (ENSG... for targets, EFO_... for diseases, CHEMBL... for drugs). Use first to find IDs, then call target/disease/drug for details. |
| `target_associations` | "What diseases is [gene] involved in" / "diseases associated with [target]" / "what does [gene] cause" — top disease associations for a drug target (Ensembl gene ID), scored by integrated Open Targets evidence (genetics, expression, animal models, drugs, literature, pathways). Use to triage what diseases a candidate target might address. |
| `disease_associations` | "Best drug targets for [disease]" / "what genes are linked to [condition]" / "druggable targets in [disease]" — top drug-target candidates for a disease (EFO ID), scored by integrated evidence. Use for target discovery in a therapeutic area. |
| `target_known_drugs` | "What drugs target [gene]" / "approved drugs against [target]" / "clinical-trial drugs for [gene]" — drugs that have been clinically tested or approved against a drug target (Ensembl gene ID). Returns drug names, mechanisms, indications, clinical trial phases. Use for competitive landscape / drug-repositioning queries. |

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

Or connect to the full Pipeworx gateway for access to all 1356+ data sources:

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
