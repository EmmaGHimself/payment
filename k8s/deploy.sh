#!/bin/sh

cd -P -- "$(dirname -- "$0")"/..

if [ "$1" == "staging" -o "$1" == "production" ]; then

    if [ $1 == "staging" ]; then
        docker build -t gcr.io/konga-kongapay/payments-service-v2-staging:latest -f Dockerfile.k8s . && \
        gcloud docker -- push gcr.io/konga-kongapay/payments-service-v2-staging:latest
    else
        docker build -t gcr.io/konga-kongapay/payments-service-v2:latest -f Dockerfile.k8s . && \
        gcloud docker -- push gcr.io/konga-kongapay/payments-service-v2:latest
    fi

    gcloud container clusters get-credentials $1 --zone europe-west2-a --project konga-kongapay

    kubectl delete -f k8s/$1/deployment.yaml && \
    kubectl apply -f k8s/$1/deployment.yaml
else
    echo "argument error"
fi
