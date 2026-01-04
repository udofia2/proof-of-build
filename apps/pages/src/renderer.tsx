import { jsxRenderer } from "hono/jsx-renderer";

export const renderer = jsxRenderer(({ children }) => {
	return (
		<html lang="en">
			<head>
				<meta charSet="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>Proof-of-Build</title>
				<link href="/static/style.css" rel="stylesheet" />
				<style>{`
					@keyframes pulse {
						0%, 100% { opacity: 1; }
						50% { opacity: 0.5; }
					}
					body {
						font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
						margin: 0;
						padding: 0;
						background-color: #f5f5f5;
					}
				`}</style>
			</head>
			<body>{children}</body>
		</html>
	);
});
