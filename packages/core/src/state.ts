import {
	type ErrorState,
	type PipelineStage,
	type ProjectId,
	type State,
	StateSchema,
} from "@proof-of-build/schemas";

/**
 * Create initial state for a project
 */
export function createInitialState(projectId: ProjectId): State {
	const now = new Date().toISOString();
	return {
		projectId,
		stage: "ingest",
		createdAt: now,
		updatedAt: now,
		metadata: {
			scriptGenerated: false,
			audioGenerated: false,
			artifactsProcessed: 0,
		},
	};
}

/**
 * Transition state to next stage
 */
export function transitionState(
	currentState: State,
	nextStage: PipelineStage,
): State {
	return {
		...currentState,
		stage: nextStage,
		updatedAt: new Date().toISOString(),
	};
}

/**
 * Create error state
 */
export function createErrorState(
	currentState: State,
	stage: PipelineStage,
	message: string,
	code?: string,
	details?: Record<string, unknown>,
): State {
	const error: ErrorState = {
		stage,
		message,
		code,
		timestamp: new Date().toISOString(),
		details,
	};

	return {
		...currentState,
		stage: "error",
		error,
		updatedAt: new Date().toISOString(),
	};
}

/**
 * Validate a state object
 */
export function validateState(data: unknown): State {
	return StateSchema.parse(data);
}

/**
 * Check if state indicates project is ready
 */
export function isReady(state: State): boolean {
	return state.stage === "ready";
}

/**
 * Check if state indicates an error
 */
export function hasError(state: State): boolean {
	return state.stage === "error";
}

/**
 * Check if state indicates processing
 */
export function isProcessing(state: State): boolean {
	return !isReady(state) && !hasError(state);
}
