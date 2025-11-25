import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter as OTLPTraceExporterHTTP } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPTraceExporter as OTLPTraceExporterGRPC } from '@opentelemetry/exporter-trace-otlp-grpc';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { diag, DiagLogger, DiagLogLevel } from '@opentelemetry/api';

const OTEL_ENABLED = process.env.OTEL_ENABLED !== 'false';
const OTEL_PROTOCOL = (process.env.OTEL_EXPORTER_OTLP_PROTOCOL || 'grpc').toLowerCase();
const OTEL_TRACES_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;
const OTEL_BASE_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
const OTEL_SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'notification-service';

class ConsoleDiagLogger implements DiagLogger {
  private errorCount = 0;
  private readonly MAX_ERRORS = 3;

  debug(message: string, ...args: unknown[]): void {
    // Suppress debug logs in production
  }

  info(message: string, ...args: unknown[]): void {
    console.log(`[OTEL INFO] ${message}`, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(`[OTEL WARN] ${message}`, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.errorCount++;
    if (this.errorCount === this.MAX_ERRORS) {
      console.warn('[OTEL] Suppressing further OpenTelemetry errors to reduce noise');
      return;
    }
    console.error(`[OTEL ERROR] ${message}`, ...args);
  }

  verbose(message: string, ...args: unknown[]): void {
    // Suppress verbose logs
  }
}

diag.setLogger(new ConsoleDiagLogger(), DiagLogLevel.ERROR);

let sdk: NodeSDK | undefined;

const endpoint = OTEL_TRACES_ENDPOINT || OTEL_BASE_ENDPOINT;

if (OTEL_ENABLED && endpoint) {
  try {
    const isHttpProtocol = OTEL_PROTOCOL === 'http/protobuf' || OTEL_PROTOCOL === 'http';
    
    let exporterUrl = endpoint;
    if (!OTEL_TRACES_ENDPOINT && OTEL_BASE_ENDPOINT && isHttpProtocol) {
      exporterUrl = OTEL_BASE_ENDPOINT.endsWith('/') 
        ? `${OTEL_BASE_ENDPOINT}v1/traces`
        : `${OTEL_BASE_ENDPOINT}/v1/traces`;
    } else if (!isHttpProtocol) {
      exporterUrl = exporterUrl.replace(/\/v1\/traces\/?$/, '');
    }
    
    const exporter = isHttpProtocol
      ? new OTLPTraceExporterHTTP({
          url: exporterUrl,
          timeoutMillis: 1000,
        })
      : new OTLPTraceExporterGRPC({
          url: exporterUrl,
          timeoutMillis: 1000,
        });

    const resource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: OTEL_SERVICE_NAME,
    });

    sdk = new NodeSDK({
      resource,
      traceExporter: exporter,
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-http': { enabled: true },
          '@opentelemetry/instrumentation-express': { enabled: true },
          '@opentelemetry/instrumentation-pg': { enabled: true },
          '@opentelemetry/instrumentation-amqplib': { enabled: true },
        }),
      ],
    });

    sdk.start();
    console.log('[OTEL] OpenTelemetry tracing initialized', {
      serviceName: OTEL_SERVICE_NAME,
      endpoint: exporterUrl,
      protocol: OTEL_PROTOCOL,
    });
  } catch (error) {
    console.error(
      '[OTEL] Failed to initialize OpenTelemetry - continuing without tracing',
      error
    );
  }
} else {
  console.log('[OTEL] OpenTelemetry tracing disabled', {
    enabled: OTEL_ENABLED,
    endpointConfigured: !!endpoint,
  });
}

export async function shutdownTracing(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    console.log('[OTEL] Tracing shut down');
  }
}