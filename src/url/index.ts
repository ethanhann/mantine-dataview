// Subpath entry for @ethanhann/mantine-dataview/url.
// It exports windowHistoryAdapter and the serializer utilities.

// Serializer utilities for consumers building custom adapters or param schemes.
export {
	type DeserializeContext,
	defaultUrlSerializer,
	deserializeParams,
	resolveInclude,
	type SerializeContext,
	type SyncableKey,
	SYNCABLE_KEYS,
	serializeState,
	stripManagedParams,
} from "./serializer";
export type { UrlSerializer, UrlStateAdapter } from "./types";
export { windowHistoryAdapter } from "./windowHistoryAdapter";
