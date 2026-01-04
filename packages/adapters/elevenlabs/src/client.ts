import type {
	ElevenLabsTextToSpeechRequest,
	ElevenLabsTextToSpeechResponse,
	ElevenLabsError,
} from "./types.js";

/**
 * ElevenLabs Client
 * 
 * Client for ElevenLabs text-to-speech API with retry logic and error handling.
 */
export class ElevenLabsClient {
	private apiKey: string;
	private baseUrl: string;
	private defaultVoiceId: string;
	private defaultModelId: string;
	private maxRetries: number;
	private retryDelayMs: number;

	constructor(options: {
		apiKey: string;
		baseUrl?: string;
		defaultVoiceId?: string;
		defaultModelId?: string;
		maxRetries?: number;
		retryDelayMs?: number;
	}) {
		this.apiKey = options.apiKey;
		this.baseUrl = options.baseUrl || "https://api.elevenlabs.io/v1";
		this.defaultVoiceId = options.defaultVoiceId || "JBFqnCBsd6RMkjVDRZzb"; // Default voice
		this.defaultModelId = options.defaultModelId || "eleven_multilingual_v2";
		this.maxRetries = options.maxRetries ?? 3;
		this.retryDelayMs = options.retryDelayMs ?? 1000;
	}

	/**
	 * Sleep for specified milliseconds
	 */
	private async sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Retry with exponential backoff
	 */
	private async retryWithBackoff<T>(
		fn: () => Promise<T>,
		retryCount = 0,
	): Promise<T> {
		try {
			return await fn();
		} catch (error) {
			if (retryCount >= this.maxRetries) {
				throw error;
			}

			// Check if error is retryable
			const isRetryable =
				error instanceof Error &&
				(error.message.includes("429") || // Rate limit
					error.message.includes("500") || // Server error
					error.message.includes("502") || // Bad gateway
					error.message.includes("503") || // Service unavailable
					error.message.includes("timeout") ||
					error.message.includes("network"));

			if (!isRetryable) {
				throw error;
			}

			// Exponential backoff
			const delay = this.retryDelayMs * Math.pow(2, retryCount);
			await this.sleep(delay);

			return this.retryWithBackoff(fn, retryCount + 1);
		}
	}

	/**
	 * Generate audio from text using ElevenLabs API
	 * 
	 * @param text - Text to convert to speech
	 * @param options - Optional parameters (voiceId, modelId, etc.)
	 * @returns Audio data as Uint8Array
	 */
	async generateAudio(
		text: string,
		options?: {
			voiceId?: string;
			modelId?: string;
			outputFormat?: "mp3_44100_128" | "mp3_44100_192" | "mp3_22050_32" | "pcm_16000" | "pcm_22050" | "pcm_24000" | "pcm_44100" | "ulaw_8000";
		},
	): Promise<ElevenLabsTextToSpeechResponse> {
		if (!text || text.trim().length === 0) {
			throw new Error("Text cannot be empty");
		}

		const voiceId = options?.voiceId || this.defaultVoiceId;
		const modelId = options?.modelId || this.defaultModelId;
		const outputFormat = options?.outputFormat || "mp3_44100_128";

		const url = `${this.baseUrl}/text-to-speech/${voiceId}?output_format=${outputFormat}`;

		const requestBody: ElevenLabsTextToSpeechRequest = {
			text,
			model_id: modelId,
			voice_settings: {
				stability: 0.5,
				similarity_boost: 0.75,
			},
		};

		return this.retryWithBackoff(async () => {
			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"xi-api-key": this.apiKey,
				},
				body: JSON.stringify(requestBody),
			});

			if (!response.ok) {
				let errorMessage = `ElevenLabs API error: ${response.status} ${response.statusText}`;
				try {
					const errorData = (await response.json()) as ElevenLabsError;
					if (errorData.detail?.message) {
						errorMessage = errorData.detail.message;
					}
				} catch {
					// Ignore JSON parse errors
				}

				const error = new Error(errorMessage);
				// Add status code for retry logic
				(error as Error & { status?: number }).status = response.status;
				throw error;
			}

			// Get audio data
			const arrayBuffer = await response.arrayBuffer();
			const audio = new Uint8Array(arrayBuffer);
			const contentType = response.headers.get("content-type") || "audio/mpeg";

			return {
				audio,
				contentType,
			};
		});
	}
}

