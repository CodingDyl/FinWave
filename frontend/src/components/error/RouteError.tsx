import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';
import { Button } from '../ui/Button';

export default function RouteError() {
  const error = useRouteError();

  let errorMessage = 'An unexpected error occurred';
  let errorStatus = 500;

  if (isRouteErrorResponse(error)) {
    errorMessage = error.statusText || error.data?.message || `Error ${error.status}`;
    errorStatus = error.status;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full mx-4">
        <div className="card p-8 text-center">
          <div className="mb-6">
            <div className="size-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
              <span className="text-2xl">
                {errorStatus === 404 ? '🔍' : '⚠️'}
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-foreground mb-2">
              {errorStatus === 404 ? 'Page Not Found' : 'Something went wrong'}
            </h1>
            <p className="text-muted-foreground mb-4">
              {errorStatus === 404 
                ? "The page you're looking for doesn't exist."
                : errorMessage
              }
            </p>
            {errorStatus !== 404 && (
              <p className="text-sm text-muted-foreground">
                Error {errorStatus}
              </p>
            )}
          </div>

          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => window.history.back()}
              className="btn btn-ghost"
            >
              Go Back
            </Button>
            <Link to="/">
              <Button className="btn btn-primary">
                Go Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
