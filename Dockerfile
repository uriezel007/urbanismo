FROM node:24-bookworm-slim AS frontend
WORKDIR /build
COPY scripts scripts
COPY web web
COPY phei phei
RUN node scripts/build-offline.mjs
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PHEI_ENV=production
WORKDIR /app
COPY api/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt && useradd --uid 10001 --create-home phei
COPY --chown=10001:10001 api api
COPY --chown=10001:10001 phei phei
COPY --from=frontend --chown=10001:10001 /build/dist dist
USER 10001
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-proxy-headers"]
