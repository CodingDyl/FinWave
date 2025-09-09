import logging, sys, structlog

def configure_logging():
    timestamper = structlog.processors.TimeStamper(fmt="iso")
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,   # pull correlation_id from context
            timestamper,
            structlog.processors.add_log_level,
            structlog.processors.dict_tracebacks,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        logger_factory=structlog.PrintLoggerFactory(file=sys.stdout),
        cache_logger_on_first_use=True,
    )
    logging.getLogger("uvicorn.access").handlers = []  # avoid duplicate noisy access logs
