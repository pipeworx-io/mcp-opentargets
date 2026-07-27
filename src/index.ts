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
    description: '"Drug target profile for [gene]" / "is [gene] a druggable target" / "[gene] target info" / "target ID [ENSG...]" — fetch a drug-target profile (Open Targets uses Ensembl gene IDs as target identifiers). Returns approved symbol, name, biotype, protein IDs, pathways, synonyms. Use for target characterization in drug discovery.',
    inputSchema: {
      type: 'object',
      properties: { ensembl_id: { type: 'string', description: 'e.g. "ENSG00000141510" (TP53)' } },
      required: ['ensembl_id'],
    },
  },
  {
    name: 'disease',
    description: '"Disease profile for [EFO_N]" / "look up disease [ID]" — fetch a disease profile from Open Targets by EFO (Experimental Factor Ontology) ID. Returns name, description, therapeutic areas, ontology cross-refs. Pair with `disease_associations` to find drug targets for the disease.',
    inputSchema: {
      type: 'object',
      properties: { efo_id: { type: 'string', description: 'e.g. "EFO_0000270" (asthma)' } },
      required: ['efo_id'],
    },
  },
  {
    name: 'drug',
    description: '"Drug info for [ChEMBL ID]" / "look up [drug] target info" / "[CHEMBL...] mechanism" — fetch a drug profile from Open Targets by ChEMBL ID. Returns name, mechanisms of action, indications, target genes, trade names, clinical-trial phase. Use for drug research, mechanism queries.',
    inputSchema: {
      type: 'object',
      properties: { chembl_id: { type: 'string', description: 'e.g. "CHEMBL1201583" (imatinib)' } },
      required: ['chembl_id'],
    },
  },
  {
    name: 'search',
    description: '"Find [disease / drug / gene target]" / "Open Targets lookup for [name]" / "what\'s the Open Targets ID for [X]" — text search across diseases, drug targets, and drugs in the Open Targets Platform (the leading drug-discovery knowledge graph). Returns ranked matches with their canonical IDs (ENSG... for targets, EFO_... for diseases, CHEMBL... for drugs). Use first to find IDs, then call target/disease/drug for details.',
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
    description: '"What diseases is [gene] involved in" / "diseases associated with [target]" / "what does [gene] cause" — top disease associations for a drug target (Ensembl gene ID), scored by integrated Open Targets evidence (genetics, expression, animal models, drugs, literature, pathways). Use to triage what diseases a candidate target might address.',
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
    description: '"Best drug targets for [disease]" / "what genes are linked to [condition]" / "druggable targets in [disease]" — top drug-target candidates for a disease (EFO ID), scored by integrated evidence. Use for target discovery in a therapeutic area.',
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
    description: '"What drugs target [gene]" / "approved drugs against [target]" / "clinical-trial drugs for [gene]" — drugs that have been clinically tested or approved against a drug target (Ensembl gene ID). Returns drug names, mechanisms, indications, clinical trial phases. Use for competitive landscape / drug-repositioning queries.',
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

// Open Targets migrated disease IDs from EFO_* to MONDO_* (2026): a legacy
// EFO id now returns `disease: null`. Accept a NAME ("asthma") or any id, and
// resolve to the platform's current id via search when a direct hit misses.
async function resolveDiseaseId(raw: string): Promise<{ id: string; resolved_from?: string; name?: string }> {
  const q = String(raw ?? '').trim();
  if (!q) throw new Error('Provide a disease name ("asthma") or ontology id ("MONDO_0004979").');
  // Try as an id first — if the platform knows it, use it as-is.
  if (/^[A-Za-z]+_\d+$/.test(q)) {
    const probe = (await otGql(`query($id:String!){ disease(efoId:$id){ id name } }`, { id: q })) as {
      disease?: { id?: string; name?: string } | null;
    };
    if (probe?.disease?.id) return { id: probe.disease.id, name: probe.disease.name };
  }
  const hit = (await otGql(
    `query($q:String!){ search(queryString:$q,entityNames:["disease"],page:{index:0,size:1}){ hits{ id name } } }`,
    { q },
  )) as { search?: { hits?: Array<{ id: string; name: string }> } };
  const first = hit?.search?.hits?.[0];
  if (first) return { id: first.id, resolved_from: q, name: first.name };
  // A retired/legacy ontology id (Open Targets moved EFO_* -> MONDO_*) is not
  // searchable as text — say so specifically instead of a generic miss.
  if (/^[A-Za-z]+_\d+$/.test(q)) {
    throw new Error(
      `Open Targets no longer has disease id "${q}". It migrated disease IDs to MONDO (e.g. asthma is now MONDO_0004979), and retired ids are not resolvable. Pass the disease NAME instead (e.g. { efo_id: "asthma" }) and this tool will resolve the current id.`,
    );
  }
  throw new Error(`No Open Targets disease matched "${q}". Try a disease name like "asthma" or a MONDO id.`);
}

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'target':
      return otGql(
        `query($id:String!){ target(ensemblId:$id){ id approvedSymbol approvedName biotype proteinIds{id source} pathways{pathwayId pathway} synonyms{label source} } }`,
        { id: reqStr(args, 'ensembl_id', '"ENSG00000141510"') },
      );
    case 'disease': {
      const d = await resolveDiseaseId(String(args.efo_id ?? args.disease ?? args.id ?? args.name ?? ''));
      const res = (await otGql(
        `query($id:String!){ disease(efoId:$id){ id name description synonyms{relation terms} therapeuticAreas{id name} } }`,
        { id: d.id },
      )) as Record<string, unknown>;
      return d.resolved_from ? { resolved_from: d.resolved_from, resolved_to: d.id, ...res } : res;
    }
    case 'drug':
      // Open Targets Drug schema drift (2026-07): maximumClinicalTrialPhase →
      // maximumClinicalStage, and the indication row's maxPhaseForIndication →
      // maxClinicalStage (type ClinicalIndicationFromDrug). The earlier
      // tradeNames{label source} fix left these two broken, so `drug` was still
      // erroring; verified corrected query returns data (CHEMBL941 imatinib).
      return otGql(
        `query($id:String!){ drug(chemblId:$id){ id name tradeNames{label source} maximumClinicalStage drugType mechanismsOfAction{rows{actionType mechanismOfAction targets{id approvedSymbol}}} indications{rows{disease{id name} maxClinicalStage}} } }`,
        { id: reqStr(args, 'chembl_id', '"CHEMBL1201583"') },
      );
    case 'search':
      return otGql(
        `query($q:String!,$entityNames:[String!],$size:Int!){ search(queryString:$q,entityNames:$entityNames,page:{index:0,size:$size}){ total hits{ id entity name description } } }`,
        {
          q: reqStr(args, 'query', '"asthma"'),
          entityNames: args.entity ? [String(args.entity)] : ['target', 'disease', 'drug'],
          size: Math.min(50, Math.max(1, (args.size as number) ?? 10)),
        },
      );
    case 'target_associations':
      return otGql(
        `query($id:String!,$size:Int!){ target(ensemblId:$id){ id approvedSymbol associatedDiseases(page:{index:0,size:$size}){ count rows{ score disease{ id name } } } } }`,
        {
          id: reqStr(args, 'ensembl_id', '"ENSG00000141510"'),
          size: Math.min(50, Math.max(1, (args.size as number) ?? 10)),
        },
      );
    case 'disease_associations': {
      const d = await resolveDiseaseId(String(args.efo_id ?? args.disease ?? args.id ?? args.name ?? ''));
      const res = (await otGql(
        `query($id:String!,$size:Int!){ disease(efoId:$id){ id name associatedTargets(page:{index:0,size:$size}){ count rows{ score target{ id approvedSymbol approvedName } } } } }`,
        { id: d.id, size: Math.min(50, Math.max(1, (args.size as number) ?? 10)) },
      )) as Record<string, unknown>;
      return d.resolved_from ? { resolved_from: d.resolved_from, resolved_to: d.id, ...res } : res;
    }
    case 'target_known_drugs':
      return otGql(
        // Schema drift 2026-07: `knownDrugs(size:)` was replaced by
        // `drugAndClinicalCandidates` — no size arg, rows carry
        // maxClinicalStage + a diseases[] of {diseaseFromSource, disease{}}.
        `query($id:String!){ target(ensemblId:$id){ id approvedSymbol drugAndClinicalCandidates{ count rows{ id maxClinicalStage drug{ id name drugType } diseases{ diseaseFromSource disease{ id name } } } } } }`,
        {
          id: reqStr(args, 'ensembl_id', '"ENSG00000141510"'),
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
