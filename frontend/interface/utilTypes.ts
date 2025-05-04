import { Field } from "knownoknown-contract";

type StatusChecker = NodeJS.Timeout | number;

interface ZkappFields { 
    knowledgeEntryMerkleRoot: Field;
    publishKnowledgeCidHash: Field;
    updateFromKnowledgeCidHash: Field;
    updateToKnowledgeCidHash: Field;
    applicationEntryMerkleRoot: Field;
    publishApplicationCidHash: Field;
    updateFromApplicationCidHash: Field;
    updateToApplicationCidHash: Field;
}

export type { ZkappFields, StatusChecker };
