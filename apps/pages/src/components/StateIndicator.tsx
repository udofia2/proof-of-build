import type { State } from "@proof-of-build/schemas";

interface StateIndicatorProps {
	state: State;
}

/**
 * State Indicator Component
 * Displays the current processing state of a project
 */
export function StateIndicator({ state }: StateIndicatorProps) {
	const getStateColor = (stage: State["stage"]) => {
		switch (stage) {
			case "ready":
				return "green";
			case "error":
				return "red";
			case "ingest":
			case "classify":
			case "generate-script":
			case "generate-audio":
			case "assemble":
				return "yellow";
			default:
				return "gray";
		}
	};

	const getStateLabel = (stage: State["stage"]) => {
		switch (stage) {
			case "ready":
				return "Ready";
			case "error":
				return "Error";
			case "ingest":
				return "Ingesting";
			case "classify":
				return "Classifying";
			case "generate-script":
				return "Generating Script";
			case "generate-audio":
				return "Generating Audio";
			case "assemble":
				return "Assembling";
			default:
				return "Processing";
		}
	};

	const color = getStateColor(state.stage);
	const label = getStateLabel(state.stage);

	return (
		<div
			style={{
				display: "inline-flex",
				alignItems: "center",
				gap: "8px",
				padding: "8px 16px",
				borderRadius: "4px",
				backgroundColor:
					color === "green"
						? "#d4edda"
						: color === "red"
							? "#f8d7da"
							: "#fff3cd",
				color:
					color === "green"
						? "#155724"
						: color === "red"
							? "#721c24"
							: "#856404",
				border: `1px solid ${
					color === "green"
						? "#c3e6cb"
						: color === "red"
							? "#f5c6cb"
							: "#ffeaa7"
				}`,
			}}
		>
			<span
				style={{
					width: "8px",
					height: "8px",
					borderRadius: "50%",
					backgroundColor:
						color === "green"
							? "#28a745"
							: color === "red"
								? "#dc3545"
								: "#ffc107",
					animation: color === "yellow" ? "pulse 2s infinite" : "none",
				}}
			/>
			<span style={{ fontWeight: "500" }}>{label}</span>
			{state.error && (
				<span style={{ fontSize: "0.875rem", opacity: 0.8 }}>
					- {state.error.message}
				</span>
			)}
		</div>
	);
}

