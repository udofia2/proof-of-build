/**
 * ElevenLabs API Types
 * 
 * TypeScript types for ElevenLabs text-to-speech API
 */

export interface ElevenLabsTextToSpeechRequest {
	text: string;
	model_id?: string;
	voice_settings?: {
		stability?: number;
		similarity_boost?: number;
		style?: number;
		use_speaker_boost?: boolean;
	};
}

export interface ElevenLabsTextToSpeechResponse {
	audio: Uint8Array;
	contentType: string;
}

export interface ElevenLabsError {
	detail?: {
		message?: string;
		status?: string;
	};
}

