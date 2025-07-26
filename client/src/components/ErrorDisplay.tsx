import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatError, isApiError } from "@/utils/errorHandler";

interface ErrorDisplayProps {
  error: any;
  onRetry?: () => void;
  className?: string;
}

export function ErrorDisplay({ error, onRetry, className }: ErrorDisplayProps) {
  if (!error) return null;

  const { title, message, isRetryable } = formatError(error);

  return (
    <Alert variant="destructive" className={className}>
      <XCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <div>
          <strong>{title}:</strong> {message}
        </div>
        {isRetryable && onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="ml-4"
          >
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

interface FieldErrorProps {
  error: any;
  fieldName: string;
}

export function FieldError({ error, fieldName }: FieldErrorProps) {
  if (!error || !isApiError(error)) return null;
  
  if (error.error.field === fieldName) {
    return (
      <p className="text-sm text-destructive mt-1">
        {error.error.message}
      </p>
    );
  }
  
  return null;
}