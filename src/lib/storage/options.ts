type BlobRegion = "ap-southeast-1" | "ap-southeast-2" | "eu-central-1" | "us-east-1" | "us-east-2";

/** Shared by the runtime driver and the upload script so both hit the same store/region. */
export function blobStoreOptions(storeName: string, region?: string) {
  return {
    name: storeName,
    consistency: "strong" as const,
    ...(region ? { region: region as BlobRegion } : {}),
  };
}
