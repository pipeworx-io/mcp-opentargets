interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Open Targets MCP — disease/target/drug knowledge graph.
 *
 * Auth: none. GraphQL endpoint:
 *   https://api.platform.opentargets.org/api/v4/graphql
 */


const ENDPOINT = 'https://api.platform.opentargets.org/api/v4/graphql';
const UA = 'pipeworx-mcp-opentargets/1.0 (+https://pipeworx.io)';

const tools: McpToolExport['tools'] = [
  {
    name: 'target',
    description: 'Target (gene) profile by Ensembl id.',
    inputSchema: {
      type: 'object',
      properties: { ensembl_id: { type: 'string', description: 'e.g. "ENSG00000141510" (TP53)' } },
      required: ['ensembl_id'],
    },
  },
  {
    name: 'disease',
    description: 'Disease profile by EFO id.',
    inputSchema: {
      type: 'object',
      properties: { efo_id: { type: 'string', description: 'e.g. "EFO_0000270" (asthma)' } },
      required: ['efo_id'],
    },
  },
  {
    name: 'drug',
    description: 'Drug profile by ChEMBL id.',
    inputSchema: {
      type: 'object',
      properties: { chembl_id: { type: 'string', description: 'e.g. "CHEMBL1201583" (imatinib)' } },
      required: ['chembl_id'],
    },
  },
  {
    name: 'search',
    description: 'Platform search across diseases/targets/drugs.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        entity: { type: 'string', description: 'target | disease | drug (omit for all)' },
        size: { type: 'number', description: '1-50 (default 10)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'target_associations',
    description: 'Top disease associations for a target.',
    inputSchema: {
      type: 'object',
      properties: {
        ensembl_id: { type: 'string' },
        size: { type: 'number', description: '1-50 (default 10)' },
      },
      required: ['ensembl_id'],
    },
  },
  {
    name: 'disease_associations',
    description: 'Top target associations for a disease.',
    inputSchema: {
      type: 'object',
      properties: {
        efo_id: { type: 'string' },
        size: { type: 'number' },
      },
      required: ['efo_id'],
    },
  },
  {
    name: 'target_known_drugs',
    description: 'Drugs clinically tested against a target.',
    inputSchema: {
      type: 'object',
      properties: {
        ensembl_id: { type: 'string' },
        size: { type: 'number', description: '1-100 (default 25)' },
      },
      required: ['ensembl_id'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'target':
      return otGql(
        `query($id:String!){ target(ensemblId:$id){ id approvedSymbol approvedName biotype proteinIds{id source} pathways{pathwayId pathway} synonyms{label source} } }`,
        { id: reqStr(args, 'ensembl_id', '"ENSG00000141510"') },
      );
    case 'disease':
      return otGql(
        `query($id:String!){ disease(efoId:$id){ id name description synonyms{terms source} therapeuticAreas{id name} } }`,
        { id: reqStr(args, 'efo_id', '"EFO_0000270"') },
      );
    case 'drug':
      return otGql(
        `query($id:String!){ drug(chemblId:$id){ id name tradeNames maximumClinicalTrialPhase drugType mechanismsOfAction{rows{actionType mechanismOfAction targets{id approvedSymbol}}} indications{rows{disease{id name} maxPhaseForIndication}} } }`,
        { id: reqStr(args, 'chembl_id', '"CHEMBL1201583"') },
      );
    case 'search':
      return otGql(
        `query($q:String!,$entityNames:[String!],$size:Int){ search(queryString:$q,entityNames:$entityNames,page:{index:0,size:$size}){ total hits{ id entity name description } } }`,
        {
          q: reqStr(args, 'query', '"asthma"'),
          entityNames: args.entity ? [String(args.entity)] : ['target', 'disease', 'drug'],
          size: Math.min(50, Math.max(1, (args.size as number) ?? 10)),
        },
      );
    case 'target_associations':
      return otGql(
        `query($id:String!,$size:Int){ target(ensemblId:$id){ id approvedSymbol associatedDiseases(page:{index:0,size:$size}){ count rows{ score disease{ id name } } } } }`,
        {
          id: reqStr(args, 'ensembl_id', '"ENSG00000141510"'),
          size: Math.min(50, Math.max(1, (args.size as number) ?? 10)),
        },
      );
    case 'disease_associations':
      return otGql(
        `query($id:String!,$size:Int){ disease(efoId:$id){ id name associatedTargets(page:{index:0,size:$size}){ count rows{ score target{ id approvedSymbol approvedName } } } } }`,
        {
          id: reqStr(args, 'efo_id', '"EFO_0000270"'),
          size: Math.min(50, Math.max(1, (args.size as number) ?? 10)),
        },
      );
    case 'target_known_drugs':
      return otGql(
        `query($id:String!,$size:Int){ target(ensemblId:$id){ id approvedSymbol knownDrugs(size:$size){ count rows{ phase drugId drug{name maximumClinicalTrialPhase} disease{name} } } } }`,
        {
          id: reqStr(args, 'ensembl_id', '"ENSG00000141510"'),
          size: Math.min(100, Math.max(1, (args.size as number) ?? 25)),
        },
      );
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function otGql(query: string, variables: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': UA },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Open Targets: ${res.status} ${await res.text().then((t) => t.slice(0, 200))}`);
  const json = (await res.json()) as { data?: unknown; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(`Open Targets GraphQL: ${json.errors.map((e) => e.message).join('; ')}`);
  return json.data;
}

function reqStr(args: Record<string, unknown>, key: string, example: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) {
    throw new Error(`Required argument "${key}" is missing. Pass a string like ${example}.`);
  }
  return v;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
