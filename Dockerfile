FROM python:3.11-slim AS app

ARG PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple
ARG PIP_TRUSTED_HOST=pypi.tuna.tsinghua.edu.cn

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_INDEX_URL=${PIP_INDEX_URL} \
    PIP_TRUSTED_HOST=${PIP_TRUSTED_HOST} \
    PYTHONPATH=/app/src

WORKDIR /app

RUN pip install --no-cache-dir \
    fastapi==0.115.14 \
    uvicorn==0.34.3 \
    pydantic==2.11.7 \
    pyyaml==6.0.3 \
    numpy==2.3.1

COPY src ./src

RUN mkdir -p /app/out

EXPOSE 8000

CMD ["uvicorn", "brake_calc.app.http_server:app", "--host", "0.0.0.0", "--port", "8000"]
