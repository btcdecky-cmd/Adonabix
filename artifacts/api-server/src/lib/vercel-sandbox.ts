import { Sandbox } from "@vercel/sandbox";

export type SandboxStatus = {
  provider: "vercel-sandbox";
  configured: boolean;
  mode: "remote" | "preview-only";
};

export function getSandboxStatus(): SandboxStatus {
  const configured = Boolean(process.env.VERCEL_OIDC_TOKEN || process.env.VERCEL_SANDBOX_TOKEN);
  return {
    provider: "vercel-sandbox",
    configured,
    mode: configured ? "remote" : "preview-only",
  };
}

export async function createProjectSandbox(): Promise<Sandbox> {
  if (!getSandboxStatus().configured) {
    throw new Error("Vercel Sandbox is not configured for this environment.");
  }
  return Sandbox.create({
    runtime: "node24",
    timeout: 10 * 60 * 1000,
  });
}
