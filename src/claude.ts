const ANTHROPIC_API_BASE = "https://api.anthropic.com/v1";
const DEFAULT_POLL_INTERVAL_MS = 5_000;

// ── Types ────────────────────────────────────────────────────────────────────

export interface MessageParam {
  role: "user" | "assistant";
  content: string;
}

export interface BatchRequestParams {
  model: string;
  max_tokens: number;
  messages: MessageParam[];
  system?: string;
}

export interface BatchRequest {
  custom_id: string;
  params: BatchRequestParams;
}

export type BatchResultType =
  | {
      type: "succeeded";
      message: {
        content: Array<{ type: "text"; text: string }>;
        stop_reason: string;
        usage: { input_tokens: number; output_tokens: number };
      };
    }
  | { type: "errored"; error: { type: string; message: string } }
  | { type: "canceled" }
  | { type: "expired" };

export interface BatchResult {
  custom_id: string;
  result: BatchResultType;
}

export interface BatchStatus {
  id: string;
  type: "message_batch";
  processing_status: "in_progress" | "canceling" | "ended";
  request_counts: {
    processing: number;
    succeeded: number;
    errored: number;
    canceled: number;
    expired: number;
  };
  created_at: string;
  expires_at: string;
  ended_at: string | null;
  results_url: string | null;
}

// ── Client ───────────────────────────────────────────────────────────────────

export class ClaudeClient {
  private readonly apiKey: string;
  readonly model: string;

  constructor(model = "claude-sonnet-4-6") {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY is not set in the environment");
    this.apiKey = key;
    this.model = model;
  }

  private get baseHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "x-api-key": this.apiKey,
      "anthropic-version": "2023-06-01",
    };
  }

  // Batch API requires its own beta header separate from the base headers
  private get batchHeaders(): Record<string, string> {
    return { ...this.baseHeaders, "anthropic-beta": "message-batches-2024-09-24" };
  }

  /**
   * Send a single message and return the assistant's text response.
   * Use this for real-time interactions — it completes in a single round-trip.
   */
  async chat(
    userMessage: string,
    options: {
      system?: string;
      maxTokens?: number;
      history?: MessageParam[];
    } = {},
  ): Promise<string> {
    const res = await fetch(`${ANTHROPIC_API_BASE}/messages`, {
      method: "POST",
      headers: this.baseHeaders,
      body: JSON.stringify({
        model: this.model,
        max_tokens: options.maxTokens ?? 1024,
        ...(options.system ? { system: options.system } : {}),
        messages: [...(options.history ?? []), { role: "user", content: userMessage }],
      }),
    });
    if (!res.ok) throw new Error(`chat failed: ${res.status} ${await res.text()}`);
    const data = await res.json() as { content: Array<{ type: string; text: string }> };
    return data.content[0]?.text ?? "";
  }

  /** Create a message batch and return its initial status. */
  async createBatch(requests: BatchRequest[]): Promise<BatchStatus> {
    const res = await fetch(`${ANTHROPIC_API_BASE}/messages/batches`, {
      method: "POST",
      headers: this.batchHeaders,
      body: JSON.stringify({ requests }),
    });
    if (!res.ok) throw new Error(`createBatch failed: ${res.status} ${await res.text()}`);
    return res.json() as Promise<BatchStatus>;
  }

  /** Fetch the current status of a batch. */
  async getBatchStatus(batchId: string): Promise<BatchStatus> {
    const res = await fetch(`${ANTHROPIC_API_BASE}/messages/batches/${batchId}`, {
      headers: this.batchHeaders,
    });
    if (!res.ok) throw new Error(`getBatchStatus failed: ${res.status} ${await res.text()}`);
    return res.json() as Promise<BatchStatus>;
  }

  /** Download and parse JSONL results once a batch has ended. */
  async getBatchResults(batchId: string): Promise<BatchResult[]> {
    const res = await fetch(`${ANTHROPIC_API_BASE}/messages/batches/${batchId}/results`, {
      headers: this.batchHeaders,
    });
    if (!res.ok) throw new Error(`getBatchResults failed: ${res.status} ${await res.text()}`);
    const text = await res.text();
    return text
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as BatchResult);
  }

  /**
   * Poll a batch until its processing_status is "ended".
   * Resolves with the final BatchStatus.
   */
  async pollBatch(batchId: string, intervalMs = DEFAULT_POLL_INTERVAL_MS): Promise<BatchStatus> {
    while (true) {
      const status = await this.getBatchStatus(batchId);
      console.log(
        `[claude] batch ${batchId} — ${status.processing_status}`,
        status.request_counts,
      );
      if (status.processing_status === "ended") return status;
      await Bun.sleep(intervalMs);
    }
  }

  /**
   * Convenience: submit a batch, wait for it to finish, and return all results.
   */
  async submitAndWait(
    requests: BatchRequest[],
    intervalMs = DEFAULT_POLL_INTERVAL_MS,
  ): Promise<BatchResult[]> {
    const batch = await this.createBatch(requests);
    console.log(`[claude] batch created: ${batch.id}`);
    await this.pollBatch(batch.id, intervalMs);
    return this.getBatchResults(batch.id);
  }

  /**
   * Helper to build a BatchRequest with sensible defaults.
   *
   * @example
   * client.makeRequest("req-1", "What is 2+2?", { maxTokens: 256 })
   */
  makeRequest(
    customId: string,
    userMessage: string,
    options: {
      system?: string;
      maxTokens?: number;
      history?: MessageParam[];
    } = {},
  ): BatchRequest {
    return {
      custom_id: customId,
      params: {
        model: this.model,
        max_tokens: options.maxTokens ?? 1024,
        ...(options.system ? { system: options.system } : {}),
        messages: [...(options.history ?? []), { role: "user", content: userMessage }],
      },
    };
  }
}
