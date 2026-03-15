# ScaleUp Deployment

This app should be deployed as 2 services:

1. `scaleup-web`
   Node + Express
   Serves the frontend and the main API routes.

2. `scaleup-python`
   FastAPI
   Handles sentiment, summary, and growth strategy analysis.

## Recommended hosting

Use Render with the included [render.yaml](/Users/vanshika/Downloads/google2/scaleup/render.yaml).

## Required environment variables

### Node service

- `APIFY_TOKEN`
- `OPENROUTER_API_KEY`
- `PYTHON_API_URL`

### Python service

- `OPENROUTER_API_KEY`

## Render deploy flow

1. Push this repo to GitHub.
2. In Render, create a new Blueprint from the repo.
3. Render will create both services from `render.yaml`.
4. Add the secret environment variables.
5. Confirm `PYTHON_API_URL` on the Node service matches your deployed Python service URL.

## Notes

- The frontend now uses relative API calls, so production requests go to the deployed Node service automatically.
- The Node app already serves the `frontend/` folder.
- Python dependencies are listed in [requirements.txt](/Users/vanshika/Downloads/google2/scaleup/python-sentiment/requirements.txt).
